export const vertexShader = `
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

const common = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uProgress;
uniform float uOpacity;
uniform vec3 uColor;
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * 0.65 + noise(p * 2.03 + 8.7) * 0.25 + noise(p * 4.01) * 0.1; }
float band(float x, float w) { return 1.0 - smoothstep(w, w + 0.018, abs(x)); }
float life(float t) { return smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.55, 1.0, t)); }
vec3 fireColor(float heat) {
    if(length(uColor) < 0.001) return vec3(0.0);
    vec3 outer = uColor * 0.75;
    vec3 middle = min(vec3(1.0), uColor * 1.35 + vec3(0.16));
    vec3 core = min(vec3(1.0), uColor * 0.35 + vec3(0.72));
    if(uColor.r > 0.9 && uColor.b < 0.2) core = vec3(1.0, 0.95, 0.38);
    return mix(mix(outer, middle, smoothstep(0.08, 0.45, heat)), core, smoothstep(0.48, 0.9, heat));
}
void outputColor(vec3 color, float alpha) {
    alpha = clamp(alpha * uOpacity, 0.0, 1.0);
    float edge = smoothstep(0.0, 0.035, min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y)));
    alpha *= edge;
    gl_FragColor = vec4(color * alpha, alpha);
}
void flame(float field, float fade) {
    float body = smoothstep(0.02, 0.08, field);
    float glow = exp(-max(0.0, -field) * 16.0) * 0.18;
    outputColor(fireColor(clamp(field * 7.0, 0.0, 1.0)), (body + glow) * fade);
}
`;

export const fragments = {
    mending: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, alpha = 0.0;
        for(int i = 0; i < 3; i++) {
            float f = float(i), q = clamp(t * 1.5 - f * 0.16, 0.0, 1.0);
            vec2 a = p - vec2(0.08 * sin(q * 5.0), 0.48 - q * 1.1);
            a = mat2(0.94, 0.34, -0.34, 0.94) * a;
            a.y *= 3.8;
            float angle = atan(a.y, a.x), r = 0.3 + q * 0.35;
            float sweep = fract((angle + q * 12.0 + f * 2.0) / TAU);
            alpha += band(length(a) - r, 0.014 + sweep * 0.014) * smoothstep(0.15, 0.7, sweep) * life(q);
        }
        outputColor(uColor, alpha);
    `,
    poisonSpray: `
        vec2 p = (vUv - 0.5) * vec2(2.0, 1.4);
        float t = uProgress, field = -2.0;
        for(int i = 0; i < 10; i++) {
            float f = float(i), seed = hash(vec2(f, 2.0));
            float age = clamp(t * 1.4 - f * 0.035, 0.0, 1.0);
            vec2 center = vec2(-0.8 + age * (1.1 + seed * 0.55), sin(f * 2.4 + age * 4.0) * age * 0.22);
            float radius = (0.055 + f * 0.018) * sin(age * PI);
            field = max(field, radius - length(p - center) + (noise(p * 12.0 + f) - 0.5) * 0.07);
        }
        float curl = p.y - sin(p.x * 9.0 - t * 6.0) * 0.08;
        field = max(field, 0.04 - abs(curl) - abs(p.x + 0.45 - t * 0.45) * 0.07);
        float holes = smoothstep(0.45, 0.85, t) * noise(p * 9.0 + t * 3.0) * 0.3;
        float body = smoothstep(0.0, 0.02, field - holes);
        outputColor(mix(uColor * 0.65, min(vec3(1.0), uColor + 0.35), smoothstep(0.04, 0.12, field)), body * life(t));
    `,
    fireSpiral: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, r = length(p), a = atan(p.y, p.x);
        float phase = a + t * 11.0 + r * 9.0;
        float spiral = abs(sin(phase * 0.5)) * 0.18;
        float radius = 0.75 - t * 0.5;
        float envelope = 1.0 - smoothstep(radius, radius + 0.07, r);
        float field = 0.055 - spiral - abs(r - radius * 0.65) * 0.06 + (noise(p * 16.0 - t * 3.0) - 0.5) * 0.06;
        flame(field * 1.6, life(t) * envelope);
    `,
    fireBeam: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, center = -0.9 + t * 1.8;
        float reach = 0.6, width = 0.07 + 0.12 * exp(-pow((p.x - center) * 5.0, 2.0));
        float curl = sin(p.x * 17.0 - uTime * 12.0) * 0.045 + sin(p.x * 8.0 + uTime * 9.0) * 0.06;
        float field = width - abs(p.y + curl) + (fbm(vec2(p.x * 13.0 - uTime * 6.0, p.y * 12.0)) - 0.5) * 0.18;
        flame(field, life(t) * (1.0 - smoothstep(reach * 0.6, reach, abs(p.x - center))));
    `,
    fireExplosion: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, r = length(p), angle = atan(p.y, p.x);
        float radius = 0.15 + 0.68 * (1.0 - pow(1.0 - t, 3.0));
        float distortion = sin(angle * 11.0 + t * 3.0) * 0.035 + sin(angle * 19.0) * 0.015;
        float rim = exp(-abs(r - radius) * 100.0) * (1.0 - t);
        float cloud = band(r - radius - distortion, 0.065) * (1.0 - smoothstep(0.2, 0.9, t));
        float flash = exp(-r * r * 10.0) * (1.0 - smoothstep(0.0, 0.35, t));
        float sparks = 0.0;
        for(int i = 0; i < 20; i++) {
            float f = float(i), a = f * 2.39996, reach = (0.25 + hash(vec2(f, 4.0)) * 0.65) * sqrt(t);
            vec2 q = p - vec2(cos(a), sin(a)) * reach;
            sparks += exp(-dot(q, q) * 6000.0) * (1.0 - t);
        }
        float alpha = (rim + cloud * 0.6 + flash + sparks) * smoothstep(0.0, 0.03, t);
        outputColor(mix(uColor * 0.45, min(vec3(1.0), uColor + 0.65), clamp(rim + flash + sparks, 0.0, 1.0)), alpha);
    `,
    cinderBurst: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress;
        p.y += t * 0.5 - 0.15;
        float height = clamp((p.y + 0.75) / 1.5, 0.0, 1.0);
        float width = sin(height * PI) * 0.32;
        float field = width - abs(p.x + sin(p.y * 7.0 - t * 8.0) * 0.1);
        field += (fbm(p * 8.0 + vec2(0.0, t * 5.0)) - 0.5) * 0.3;
        field -= smoothstep(0.25, 0.9, t) * (0.12 + noise(p * 7.0) * 0.22);
        flame(field, life(t) * (1.0 - smoothstep(0.65, 0.9, abs(p.y))));
    `,
    hearthOrb: `
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p), a = atan(p.y, p.x);
        float rim = 0.57 + sin(a * 9.0 + uTime * 4.0) * 0.018 + sin(a * 15.0 - uTime * 3.0) * 0.012;
        float z = sqrt(max(0.0, 0.57 * 0.57 - dot(p, p)));
        vec3 normal = vec3(p.x, p.y, z) / 0.57;
        float c = cos(uTime * 2.0), s = sin(uTime * 2.0);
        normal.xz = mat2(c, -s, s, c) * normal.xz;
        float patch = max(dot(normal, normalize(vec3(0.7, -0.45, 0.6))), dot(normal, normalize(vec3(-0.5, 0.45, 0.7))));
        patch = max(patch, dot(normal, normalize(vec3(0.35, 0.65, -0.7))));
        patch = max(patch, dot(normal, normalize(vec3(-0.8, -0.4, -0.35))));
        float spots = smoothstep(0.86, 0.88, patch + sin(normal.y * 13.0 + normal.x * 8.0 + uTime * 2.0) * 0.018);
        float body = 1.0 - smoothstep(rim - 0.01, rim + 0.01, r);
        float glow = exp(-max(0.0, r - rim) * 15.0) * 0.24;
        outputColor(mix(uColor, fireColor(1.0), spots), body + glow);
    `,
    rebukeWings: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, x = abs(p.x);
        float arch = 0.32 - pow(clamp(x, 0.0, 1.0), 1.2) * (0.6 + t * 0.5);
        float feather = sin(atan(p.y - 0.15, x) * 27.0 + t * 5.0) * 0.055;
        float wing = 0.12 + sin(clamp(x / 0.8, 0.0, 1.0) * PI) * 0.12 - abs(p.y - arch) + feather;
        wing += (fbm(p * 16.0 + vec2(0.0, t * 6.0)) - 0.5) * 0.16;
        wing -= smoothstep(0.3, 0.95, t) * 0.22;
        float limits = smoothstep(0.03, 0.14, x) * (1.0 - smoothstep(0.7, 0.88, x));
        flame(wing, life(t) * limits);
    `,
    strideImpact: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, x = abs(p.x), y = p.y + t * 0.3;
        float head = 0.27 - length(vec2(p.x * 0.95, (y + 0.05) * 0.75));
        float snout = 0.17 - length(vec2(p.x * 1.5, (y - 0.3) * 0.8));
        float horns = 0.1 - abs(x - (0.25 - (y + 0.15) * 0.4));
        horns = min(horns, min(y + 0.6, -y));
        float field = max(max(head, snout), horns);
        field += (fbm(p * 13.0 + vec2(0.0, t * 8.0)) - 0.5) * 0.19;
        field -= smoothstep(0.2, 0.95, t) * 0.24;
        float eyes = exp(-pow((x - 0.12) * 35.0, 2.0) - pow((y + 0.07) * 35.0, 2.0));
        flame(field - eyes * 0.35, life(t));
    `,
    strideRing: `
        vec2 p = (vUv - 0.5) * vec2(2.0, 5.0);
        float r = length(p), a = atan(p.y, p.x);
        float flicker = sin(a * 9.0 - uTime * 8.0) * 0.035 + sin(a * 17.0 + uTime * 5.0) * 0.02;
        float field = 0.075 - abs(r - 0.65 + flicker);
        field += (noise(vec2(a * 4.0, r * 10.0 - uTime * 3.0)) - 0.5) * 0.09;
        flame(field, 1.0);
    `,
    flamesEmbrace: `
        vec2 p = (vUv - 0.5) * 2.0;
        float y = clamp((p.y + 0.85) / 1.7, 0.0, 1.0);
        float width = pow(y, 0.8) * 0.21 * sin(y * PI);
        float bend = sin(p.y * 6.0 + uTime * 5.0) * (1.0 - y) * 0.22;
        float field = width - abs(p.x + bend);
        field += (fbm(vec2(p.x * 12.0, p.y * 8.0 + uTime * 5.0)) - 0.5) * (1.0 - y) * 0.14;
        flame(field, smoothstep(-0.9, -0.65, p.y) * (1.0 - smoothstep(0.65, 0.9, p.y)));
    `,
    acidSplash: `
        vec2 p = (vUv - 0.5) * 2.0;
        float t = uProgress, r = length(p), a = atan(p.y, p.x);
        float radius = 0.08 + sqrt(t) * 0.75;
        float spikes = sin(a * 11.0 + sin(a * 5.0)) * 0.07 + sin(a * 19.0) * 0.03;
        float thickness = max(0.012, (1.0 - t) * 0.12);
        float ring = band(r - radius - spikes * (1.0 - t), thickness);
        float gaps = smoothstep(t * 0.8, t * 0.8 + 0.15, noise(vec2(a * 4.0, t * 2.0)));
        float center = (1.0 - smoothstep(0.0, radius, r)) * (1.0 - smoothstep(0.1, 0.3, t));
        outputColor(uColor, (ring * gaps + center) * life(t));
    `
};

export function fragmentShader(kind) {
    return `${common}\nvoid main() {\n${fragments[kind]}\n}`;
}
