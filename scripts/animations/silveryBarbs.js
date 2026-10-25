import {broadcastTokenAnimation, playTokenAnimation} from "./procedural.js";

const duration = 3200;
const travelDuration = 1900;

/** Draws a reusable musical note without loading fonts or image textures. */
function createNote(paired) {
    const note = new PIXI.Graphics();
    note.beginFill(0xffffff);
    if(paired) {
        note.drawEllipse(-8, 7, 5.7, 4).drawEllipse(8, 2, 5.7, 4);
        note.drawRect(-4.5, -18, 2.3, 25).drawRect(11.5, -23, 2.3, 25);
        note.drawPolygon([-4.5, -18, 13.8, -23, 13.8, -17.5, -4.5, -12.5]);
    } else {
        note.drawEllipse(0, 8, 5.7, 4).drawRect(3.4, -20, 2.3, 28);
        note.moveTo(5.7, -20).quadraticCurveTo(18, -12, 10, -4)
            .quadraticCurveTo(14, -12, 5.7, -14).closePath();
    }
    note.endFill();
    return note;
}

/** Creates a curved silver staff carrying violet notes into a small scattering of sparks. */
export function createSilveryBarbsVisual({distance, size, intensity = 1}) {
    const container = new PIXI.Container();
    container.eventMode = "none";
    container.interactiveChildren = false;
    const overlapping = distance < 1;
    const bend = Math.min(size * 1.1, distance * 0.22);
    const spacing = size * 0.075;
    const point = {x: 0, y: 0, angle: 0};
    const sample = t => {
        const a = Math.PI * t;
        point.x = overlapping ? Math.sin(a) * size * 0.7 : distance * t;
        point.y = overlapping ? -Math.sin(a * 2) * size * 0.35 : -Math.sin(a) * bend + Math.sin(a * 2) * bend * 0.35;
        const dx = overlapping ? Math.cos(a) * size * 0.7 * Math.PI : distance;
        const dy = overlapping ? -Math.cos(a * 2) * size * 0.7 * Math.PI : -Math.cos(a) * bend * Math.PI + Math.cos(a * 2) * bend * 0.7 * Math.PI;
        point.angle = Math.atan2(dy, dx);
    };
    const staff = new PIXI.Graphics();
    container.addChild(staff);
    for(const [width, alpha] of [[size * 0.045, 0.1], [Math.max(0.8, size * 0.012), 0.6]]) {
        for(let line = -2; line <= 2; line++) {
            staff.lineStyle(width, 0xd5e3e5, alpha);
            for(let step = 0; step <= 72; step++) {
                sample(step / 72);
                const x = point.x - Math.sin(point.angle) * spacing * line;
                const y = point.y + Math.cos(point.angle) * spacing * line;
                if(step === 0) staff.moveTo(x, y);
                else staff.lineTo(x, y);
            }
        }
    }
    const reveal = new PIXI.Graphics().beginFill(0xffffff).drawRect(0, -size * 3, 1, size * 6).endFill();
    container.addChild(reveal);
    staff.mask = reveal;
    const templates = [createNote(false), createNote(true)];
    const notes = Array.from({length: 18}, (_, i) => {
        const note = new PIXI.Graphics(templates[i % 3 === 0 ? 1 : 0].geometry);
        note.tint = [0xe2a9f4, 0xc49ce9, 0xf0c7ff][i % 3];
        note.scale.set(size / 80 * (0.7 + i % 4 * 0.08));
        container.addChild(note);
        return {note, start: 100 + i * 55, lane: (i % 5 - 2) * spacing * 0.65, phase: i * 1.7};
    });
    for(const template of templates) template.destroy();
    const sparkTemplate = new PIXI.Graphics().beginFill(0xffffff)
        .drawPolygon([0, -10, 1.8, -1.8, 8, 0, 1.8, 1.8, 0, 10, -1.8, 1.8, -8, 0, -1.8, -1.8]).endFill();
    const sparks = Array.from({length: 12}, (_, i) => {
        const spark = new PIXI.Graphics(sparkTemplate.geometry);
        spark.tint = i % 2 ? 0xe4baff : 0xc3cce9;
        container.addChild(spark);
        return {spark, start: 1900 + i * 55, angle: i * 2.39996, reach: size * (0.3 + i % 4 * 0.12)};
    });
    sparkTemplate.destroy();
    return {
        container,
        duration,
        update(elapsed) {
            const active = elapsed >= 0 && elapsed < duration;
            container.visible = active;
            if(!active) return;
            const head = Math.min(1, elapsed / travelDuration);
            const tail = Math.max(0, Math.min(1, (elapsed - 1250) / travelDuration));
            reveal.position.x = overlapping ? -size : distance * tail - spacing * 2;
            reveal.scale.x = overlapping ? size * 3 : Math.max(0.01, distance * (head - tail) + spacing * 4);
            staff.alpha = intensity * Math.min(1, elapsed / 180) * Math.min(1, (duration - elapsed) / 400);
            for(const {note, start, lane, phase} of notes) {
                const t = (elapsed - start) / travelDuration;
                note.visible = t > 0 && t < 1;
                if(!note.visible) continue;
                sample(t);
                const offset = lane + Math.sin(t * Math.PI * 4 + phase) * size * 0.035;
                note.position.set(point.x - Math.sin(point.angle) * offset, point.y + Math.cos(point.angle) * offset);
                note.rotation = point.angle * 0.3 + Math.sin(t * Math.PI * 3 + phase) * 0.12;
                note.alpha = intensity * Math.min(1, t / 0.08, (1 - t) / 0.12);
            }
            for(const {spark, start, angle, reach} of sparks) {
                const t = (elapsed - start) / 650;
                spark.visible = t > 0 && t < 1;
                if(!spark.visible) continue;
                const radius = reach * (1 - (1 - t) * (1 - t));
                spark.position.set(distance + Math.cos(angle) * radius, Math.sin(angle) * radius);
                spark.scale.set(size / 80 * (0.35 + t * 0.3));
                spark.rotation = angle + t * 0.6;
                spark.alpha = intensity * Math.sin(t * Math.PI) * 0.8;
            }
        },
        destroy() {
            if(!container.destroyed) container.destroy({children: true});
        }
    };
}

/** Broadcasts the musical visual from the Silvery Barbs caster to the creature being rerolled. */
export function silveryBarbsAnimation(options) {
    return broadcastTokenAnimation("playSilveryBarbsAnimation", options);
}

/** Starts local musical playback using the shared scene and visibility guards. */
export function playSilveryBarbsAnimation(data) {
    return playTokenAnimation(data, createSilveryBarbsVisual);
}
