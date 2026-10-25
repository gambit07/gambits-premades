import {broadcastTokenAnimation, playTokenAnimation} from "./procedural.js";
const burstDuration = 600;
const playbackDurationScale = 2.5;

const vertexShader = `
precision highp float;
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;
varying vec2 vUv;
void main() {
    vUv = aTextureCoord;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
}`;

const boltShader = `
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uLength;
uniform float uOpacity;
void main() {
    vec2 p = vec2(vUv.x * uLength, (vUv.y - 0.5) * 1.1);
    float head = uProgress * uLength;
    float behind = head - p.x;
    float tail = min(uLength, 3.8);
    float taper = clamp(1.0 - behind / max(tail, 0.01), 0.0, 1.0);
    float span = smoothstep(-0.02, 0.03, behind) * (1.0 - smoothstep(tail * 0.8, tail, behind));
    float width = 0.012 + 0.045 * taper * taper;
    float line = exp(-abs(p.y) / width) * span;
    vec2 tipPoint = vec2((behind - 0.14) * 8.0, p.y * 17.0);
    float tip = exp(-dot(tipPoint, tipPoint));
    float fin = abs(abs(p.y) - 0.2 * sin(clamp(behind / 0.7, 0.0, 1.0) * 3.14159));
    float fins = exp(-fin * 55.0) * smoothstep(0.0, 0.1, behind) * (1.0 - smoothstep(0.5, 0.8, behind));
    float halo = exp(-abs(p.y) / 0.13) * span * taper * 0.3;
    float alpha = clamp(line * 1.5 + fins + halo + tip, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}`;

const impactShader = `
precision highp float;
varying vec2 vUv;
uniform float uProgress;
uniform float uOpacity;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
void main() {
    float t = uProgress;
    vec2 p = (vUv - 0.5) * 2.0;
    vec2 q = (p + vec2(0.12 + t * 0.12, 0.0)) / vec2(0.85, 1.0);
    float radius = (0.13 + 0.57 * (1.0 - exp(-t * 13.0))) * (1.0 + t * 0.14);
    float r = length(q);
    float n = noise(q * 8.0 + vec2(-t * 3.0, t * 2.0));
    float edge = abs(r - radius + (n - 0.5) * 0.035);
    float left = 1.0 - smoothstep(-0.3, 0.5, q.x / radius);
    float rim = exp(-edge * 60.0) * (0.2 + left * 0.8);
    float glow = exp(-edge * 18.0) * (0.2 + left * 0.4);
    float inside = 1.0 - smoothstep(radius - 0.015, radius + 0.015, r);
    float height = sqrt(max(0.0, radius * radius - q.x * q.x));
    float threads = 0.0;
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float level = -0.9 + fi * 0.255;
        float bend = sin(q.x / radius * 2.8 - t * 5.0 + 0.4);
        float y = height * level + radius * 0.33 * (1.0 - level * level) * bend;
        y += (n - 0.5) * 0.09 + sin(q.x * 12.0 + fi * 1.7 + t * 5.0) * 0.012;
        float d = abs(q.y - y);
        float strength = 0.65 + 0.35 * sin(fi * 1.8 + q.x * 5.0 - t * 6.0);
        threads += exp(-d * 32.0) * strength;
    }
    float breakup = smoothstep(t * 1.1 - 0.4, t * 1.1 - 0.1, n);
    threads *= inside * breakup;
    rim *= mix(1.0, breakup, smoothstep(0.25, 0.65, t));
    float wisps = 0.0;
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float a = fi * 2.39996 + t * (0.3 + mod(fi, 3.0) * 0.25);
        float spread = radius + 0.04 + t * (0.15 + mod(fi, 4.0) * 0.04);
        vec2 c = vec2(cos(a), sin(a)) * spread;
        vec2 delta = q - c;
        float radial = dot(delta, vec2(cos(a), sin(a)));
        float tangent = dot(delta, vec2(-sin(a), cos(a)));
        float curl = abs(radial + tangent * tangent * 3.0);
        wisps += exp(-curl * 100.0) * (1.0 - smoothstep(0.025, 0.15, abs(tangent))) * (0.4 + 0.4 * sin(fi + t * 7.0));
    }
    float life = smoothstep(0.0, 0.045, t) * (1.0 - smoothstep(0.3, 1.0, t));
    float energy = rim * 1.5 + threads * 1.2 + wisps * 0.9;
    float opening = 1.0 - smoothstep(0.7 - t * 0.4, 1.0 - t * 0.4, q.x / radius);
    float alpha = clamp(energy + glow, 0.0, 1.0) * life * opening * uOpacity;
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}`;

/** Samples the procedural animation in reverse, gathering energy at the target and drawing it back to the counterspeller. */
export function createCounterspellVisual({distance, size, intensity = 1}) {
    const container = new PIXI.Container();
    container.eventMode = "none";
    container.interactiveChildren = false;
    const meshes = [];
    function mesh(fragment, width, height, uniforms) {
        const geometry = new PIXI.Geometry()
            .addAttribute("aVertexPosition", [0, -height / 2, width, -height / 2, width, height / 2, 0, height / 2], 2)
            .addAttribute("aTextureCoord", [0, 0, 1, 0, 1, 1, 0, 1], 2)
            .addIndex([0, 1, 2, 0, 2, 3]);
        const shader = PIXI.Shader.from(vertexShader, fragment, {uProgress: 0, uOpacity: intensity, ...uniforms});
        const effect = new PIXI.Mesh(geometry, shader);
        effect.blendMode = PIXI.BLEND_MODES.NORMAL;
        effect.eventMode = "none";
        container.addChild(effect);
        meshes.push(effect);
        return effect;
    }
    const bolt = mesh(boltShader, Math.max(distance, 1), size * 1.1, {uLength: Math.max(distance / size, 0.01)});
    const impact = mesh(impactShader, size * 3, size * 3);
    impact.x = distance - size * 1.5;
    impact.visible = false;
    const flightDuration = distance < 1 ? 0 : Math.min(220, 100 + distance / size * 10);
    const duration = (flightDuration + burstDuration) * playbackDurationScale;
    return {
        container,
        duration,
        update(elapsed) {
            const time = Math.max(0, Math.min(duration, duration - elapsed)) / playbackDurationScale;
            const active = elapsed >= 0 && elapsed < duration;
            bolt.visible = active && distance >= 1 && time < flightDuration + 65;
            bolt.shader.uniforms.uProgress = Math.min(1, time / Math.max(1, flightDuration));
            bolt.shader.uniforms.uOpacity = intensity * Math.max(0, 1 - Math.max(0, time - flightDuration) / 65);
            impact.visible = active && time >= flightDuration;
            impact.shader.uniforms.uProgress = Math.max(0, Math.min(1, (time - flightDuration) / burstDuration));
        },
        destroy() {
            for(const effect of meshes) {
                if(!effect.destroyed) effect.destroy();
            }
            if(!container.destroyed) container.destroy();
        }
    };
}

/** Broadcasts the reversed energy visual from the interrupted spellcaster to the counterspeller. */
export function counterspellAnimation(options) {
    return broadcastTokenAnimation("playCounterspellAnimation", options);
}

/** Starts local energy playback using the shared scene and visibility guards. */
export function playCounterspellAnimation(data) {
    return playTokenAnimation(data, createCounterspellVisual);
}
