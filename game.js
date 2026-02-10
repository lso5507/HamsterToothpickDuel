let gameMode = null;
let gameInstance = null;

const menuEl = document.getElementById("menu");
const gameContainer = document.getElementById("game-container");
const gameRoot = document.getElementById("game");
const statusEl = document.getElementById("status");

const W = 1200;
const H = 700;
const PLAYER_SPEED = 260;
const MIN_SHOT_SPEED = 430;
const MAX_SHOT_SPEED = 1120;
const SHOT_LENGTH = 36;
const SHOT_RADIUS = 1.9;
const WALL_BOUNCE_MARGIN = 2;
const FIRE_COOLDOWN = 0.17;
const FIXED_STEP = 1 / 120;
const MAX_CHARGE_TIME = 2;
const SELF_DESTRUCT_HOLD = 4;
const TOOTHPICK_CORE_COLOR = 0x7be38f;
const TOOTHPICK_EDGE_COLOR = 0x2f8d47;
const TOOTHPICK_TIP_COLOR = 0xb7ffc6;
const BGM_PATH = "./assets/tom-and-jerry-bgm.mp3";
const BGM_VOLUME = 0.42;

const keys = new Set();
const player0Keys = new Set();
const player1Keys = new Set();
const shots = [];
let winner = null;
let accumulator = 0;
let simTime = 0;
let bgmStarted = false;
const bgmAudio = new Audio(BGM_PATH);
bgmAudio.loop = true;
bgmAudio.volume = BGM_VOLUME;

const hamsterShape = [
  { x: 0, y: 0, r: 18 },
  { x: -14, y: -16, r: 8.5 },
  { x: 14, y: -16, r: 8.5 },
  { x: -12, y: 11, r: 6 },
  { x: 12, y: 11, r: 6 },
  { x: -20, y: -2, r: 5 },
  { x: 20, y: -2, r: 5 },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function norm(x, y) {
  const len = Math.hypot(x, y);
  if (len < 1e-8) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

function distSqToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = 0;
  if (abLenSq > 1e-8) t = clamp(dot(apx, apy, abx, aby) / abLenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

function segmentIntersectsCircle(ax, ay, bx, by, cx, cy, r) {
  return distSqToSegment(cx, cy, ax, ay, bx, by) <= r * r;
}

function sweptSegmentHitsCircle(ax0, ay0, bx0, by0, ax1, ay1, bx1, by1, cx, cy, radius) {
  const checks = 12;
  for (let i = 0; i <= checks; i += 1) {
    const t = i / checks;
    const sx1 = ax0 + (ax1 - ax0) * t;
    const sy1 = ay0 + (ay1 - ay0) * t;
    const sx2 = bx0 + (bx1 - bx0) * t;
    const sy2 = by0 + (by1 - by0) * t;
    if (segmentIntersectsCircle(sx1, sy1, sx2, sy2, cx, cy, radius)) return true;
  }
  return false;
}

function shotVsHamsterPrecise(shot, player) {
  const ax0 = shot.prevX;
  const ay0 = shot.prevY;
  const bx0 = shot.prevX - shot.dx * SHOT_LENGTH;
  const by0 = shot.prevY - shot.dy * SHOT_LENGTH;

  const ax1 = shot.x;
  const ay1 = shot.y;
  const bx1 = shot.x - shot.dx * SHOT_LENGTH;
  const by1 = shot.y - shot.dy * SHOT_LENGTH;

  for (const c of hamsterShape) {
    const cx = player.x + c.x;
    const cy = player.y + c.y;
    const radius = c.r + SHOT_RADIUS;
    if (segmentIntersectsCircle(ax1, ay1, bx1, by1, cx, cy, radius)) return true;
    if (sweptSegmentHitsCircle(ax0, ay0, bx0, by0, ax1, ay1, bx1, by1, cx, cy, radius)) {
      return true;
    }
  }
  return false;
}

function createHamsterSprite(color) {
  const c = new PIXI.Container();

  const shadow = new PIXI.Graphics();
  shadow.ellipse(0, 24, 24, 8).fill({ color: 0x000000, alpha: 0.22 });
  c.addChild(shadow);

  const tail = new PIXI.Graphics();
  tail.circle(-20, 10, 4.2).fill(0xf7c7d2);
  c.addChild(tail);

  const feet = new PIXI.Graphics();
  feet.roundRect(-14, 15, 10, 6, 3).fill(0xf7d8b6);
  feet.roundRect(4, 15, 10, 6, 3).fill(0xf7d8b6);
  c.addChild(feet);

  const body = new PIXI.Graphics();
  body.circle(0, 2, 20).fill(color);
  body.circle(-14, -15, 8.8).fill(0xf2d8b8);
  body.circle(14, -15, 8.8).fill(0xf2d8b8);
  body.circle(-14, -15, 4.2).fill(0xf8b4c5);
  body.circle(14, -15, 4.2).fill(0xf8b4c5);
  body.circle(0, 8, 12.8).fill(0xffedcf);
  body.circle(-8.3, -2.5, 4).fill(0xffffff);
  body.circle(8.3, -2.5, 4).fill(0xffffff);
  body.circle(-8, -2.3, 1.6).fill(0x171717);
  body.circle(8, -2.3, 1.6).fill(0x171717);
  body.circle(-4.6, 5.8, 2.4).fill(0xffb6c3);
  body.circle(4.6, 5.8, 2.4).fill(0xffb6c3);
  body.circle(0, 3.4, 2.3).fill(0xe98ba1);
  body.moveTo(-3.5, 8.9);
  body.lineTo(0, 10.6);
  body.lineTo(3.5, 8.9);
  body.stroke({ color: 0x9a5c6d, width: 1.4, alpha: 0.9 });
  c.addChild(body);

  const spear = new PIXI.Graphics();
  c.addChild(spear);

  c.spear = spear;
  return c;
}

function updateHamsterSpear(sprite, dirX, dirY) {
  const spear = sprite.spear;
  const handX = dirX * 17;
  const handY = dirY * 17;
  const tipX = handX + dirX * 24;
  const tipY = handY + dirY * 24;
  spear.clear();
  spear.moveTo(handX, handY);
  spear.lineTo(tipX, tipY);
  spear.stroke({ color: TOOTHPICK_EDGE_COLOR, width: 3.4, alpha: 0.9, cap: "round" });
  spear.moveTo(handX, handY);
  spear.lineTo(tipX, tipY);
  spear.stroke({ color: TOOTHPICK_CORE_COLOR, width: 2.1, alpha: 0.98, cap: "round" });
}

function makeBurst(layer, x, y, color) {
  const ring = new PIXI.Graphics();
  ring.circle(0, 0, 22).stroke({ color, width: 3, alpha: 0.85 });
  ring.x = x;
  ring.y = y;
  layer.addChild(ring);

  const flash = new PIXI.Graphics();
  flash.circle(0, 0, 12).fill({ color, alpha: 0.7 });
  flash.x = x;
  flash.y = y;
  layer.addChild(flash);

  gsap.to(ring.scale, { x: 2.4, y: 2.4, duration: 0.28, ease: "power2.out" });
  gsap.to(ring, {
    alpha: 0,
    duration: 0.28,
    ease: "power2.out",
    onComplete: () => ring.destroy(),
  });
  gsap.to(flash, {
    alpha: 0,
    duration: 0.16,
    ease: "power2.out",
    onComplete: () => flash.destroy(),
  });
}

function drawShot(shot) {
  const angle = Math.atan2(shot.dy, shot.dx);
  const wobble = Math.sin(shot.age * 24 + shot.phase) * 0.07;
  const g = shot.gfx;
  g.x = shot.x;
  g.y = shot.y;
  g.rotation = angle + wobble;
  g.clear();

  for (let i = 1; i < shot.trail.length; i += 1) {
    const a = shot.trail[i - 1];
    const b = shot.trail[i];
    const alpha = b.a * 0.8;
    g.moveTo(a.x - shot.x, a.y - shot.y);
    g.lineTo(b.x - shot.x, b.y - shot.y);
    g.stroke({ color: TOOTHPICK_CORE_COLOR, width: 1.8 + alpha * 2.4, alpha });
  }

  g.moveTo(0, 0);
  g.lineTo(-SHOT_LENGTH, 0);
  g.stroke({ color: TOOTHPICK_EDGE_COLOR, width: SHOT_RADIUS * 3.4, alpha: 0.92, cap: "round" });

  g.moveTo(0, 0);
  g.lineTo(-SHOT_LENGTH, 0);
  g.stroke({ color: TOOTHPICK_CORE_COLOR, width: SHOT_RADIUS * 2.1, alpha: 0.99, cap: "round" });

  g.moveTo(0, 0);
  g.lineTo(-5.5, -2.8);
  g.lineTo(-5.5, 2.8);
  g.closePath();
  g.fill({ color: TOOTHPICK_TIP_COLOR, alpha: 0.98 });
}

async function boot() {
  const app = new PIXI.Application();
  gameInstance = { app };
  await app.init({
    width: W,
    height: H,
    background: "#0c1015",
    antialias: true,
  });
  gameRoot.appendChild(app.canvas);

  const world = new PIXI.Container();
  const shotLayer = new PIXI.Container();
  const fxLayer = new PIXI.Container();
  app.stage.addChild(world);
  app.stage.addChild(shotLayer);
  app.stage.addChild(fxLayer);

  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H * 0.66).fill({ color: 0xf7e6cc, alpha: 1 });
  bg.rect(0, H * 0.66, W, H * 0.34).fill({ color: 0xc79b67, alpha: 1 });

  for (let y = 18; y < H * 0.66; y += 26) {
    bg.moveTo(0, y);
    bg.lineTo(W, y);
    bg.stroke({ color: 0xe8d1ad, width: 2, alpha: 0.55 });
  }

  for (let x = 0; x <= W; x += 44) {
    bg.moveTo(x, H * 0.66);
    bg.lineTo(x, H);
    bg.stroke({ color: 0xb6844f, width: 2, alpha: 0.6 });
  }

  bg.roundRect(86, 112, 196, 140, 20).fill({ color: 0xd9efff, alpha: 1 });
  bg.roundRect(86, 112, 196, 140, 20).stroke({ color: 0xffffff, width: 8, alpha: 0.95 });
  bg.moveTo(184, 120);
  bg.lineTo(184, 244);
  bg.moveTo(98, 182);
  bg.lineTo(270, 182);
  bg.stroke({ color: 0xffffff, width: 5, alpha: 0.88 });

  bg.roundRect(W - 280, 84, 150, 170, 24).fill({ color: 0xead9bf, alpha: 1 });
  bg.roundRect(W - 286, 74, 162, 12, 6).fill({ color: 0xb48757, alpha: 1 });
  bg.roundRect(W - 266, 104, 52, 124, 8).fill({ color: 0xfff1da, alpha: 1 });
  bg.roundRect(W - 200, 104, 52, 124, 8).fill({ color: 0xfff1da, alpha: 1 });

  bg.circle(136, H - 102, 56).fill({ color: 0xeb7f6d, alpha: 1 });
  bg.circle(136, H - 102, 46).fill({ color: 0xf9d0a1, alpha: 1 });
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    bg.moveTo(136, H - 102);
    bg.lineTo(136 + Math.cos(a) * 44, H - 102 + Math.sin(a) * 44);
    bg.stroke({ color: 0xeb7f6d, width: 3, alpha: 0.9 });
  }

  bg.roundRect(458, H - 168, 290, 122, 46).fill({ color: 0xf4dfb7, alpha: 1 });
  bg.ellipse(542, H - 128, 62, 42).fill({ color: 0xe9ca97, alpha: 1 });
  bg.roundRect(560, H - 132, 178, 70, 32).fill({ color: 0xf8ebcf, alpha: 1 });

  bg.roundRect(0, H * 0.645, W, 8, 4).fill({ color: 0xaf7a45, alpha: 0.9 });
  world.addChild(bg);

  const players = [
    {
      id: 1,
      x: 150,
      y: H / 2,
      dirX: 1,
      dirY: 0,
      controls: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", fire: "ShiftLeft" },
      cooldown: 0,
      color: 0xf4b14d,
      hitColor: 0xffd27f,
      alive: true,
      chargeActive: false,
      chargeStart: 0,
      chargeSeconds: 0,
      sprite: createHamsterSprite(0xf4b14d),
    },
    {
      id: 2,
      x: W - 150,
      y: H / 2,
      dirX: -1,
      dirY: 0,
      controls: gameMode === "local" 
        ? { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", fire: "ShiftRight" }
        : { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", fire: "ShiftLeft" },
      cooldown: 0,
      color: 0x79c4ff,
      hitColor: 0xb7e4ff,
      alive: true,
      chargeActive: false,
      chargeStart: 0,
      chargeSeconds: 0,
      sprite: createHamsterSprite(0x79c4ff),
    },
  ];

  for (const p of players) {
    world.addChild(p.sprite);
    updateHamsterSpear(p.sprite, p.dirX, p.dirY);
  }

  function spawnMuzzle(player) {
    const x = player.x + player.dirX * 30;
    const y = player.y + player.dirY * 30;
    const spark = new PIXI.Graphics();
    spark.circle(0, 0, 7).fill({ color: player.hitColor, alpha: 0.9 });
    spark.x = x;
    spark.y = y;
    fxLayer.addChild(spark);
    gsap.to(spark.scale, { x: 1.8, y: 1.8, duration: 0.14, ease: "power2.out" });
    gsap.to(spark, {
      alpha: 0,
      duration: 0.14,
      ease: "power2.out",
      onComplete: () => spark.destroy(),
    });
  }

  function explodePlayer(player) {
    if (!player.alive || winner) return;
    player.alive = false;
    player.chargeActive = false;
    player.chargeSeconds = 0;

    const x = player.x;
    const y = player.y;

    const flash = new PIXI.Graphics();
    flash.circle(0, 0, 18).fill({ color: 0xffffff, alpha: 0.95 });
    flash.x = x;
    flash.y = y;
    fxLayer.addChild(flash);

    const ring = new PIXI.Graphics();
    ring.circle(0, 0, 20).stroke({ color: player.hitColor, width: 5, alpha: 0.95 });
    ring.x = x;
    ring.y = y;
    fxLayer.addChild(ring);

    for (let i = 0; i < 22; i += 1) {
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.3;
      const dist = 46 + Math.random() * 70;
      const chunk = new PIXI.Graphics();
      chunk.circle(0, 0, 3 + Math.random() * 4).fill({ color: i % 2 ? player.color : 0xfff1da, alpha: 0.95 });
      chunk.x = x;
      chunk.y = y;
      fxLayer.addChild(chunk);

      gsap.to(chunk, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 0.36,
        ease: "power2.out",
        onComplete: () => chunk.destroy(),
      });
    }

    gsap.to(flash.scale, { x: 2.8, y: 2.8, duration: 0.18, ease: "power2.out" });
    gsap.to(flash, { alpha: 0, duration: 0.18, ease: "power2.out", onComplete: () => flash.destroy() });
    gsap.to(ring.scale, { x: 2.6, y: 2.6, duration: 0.24, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.24, ease: "power2.out", onComplete: () => ring.destroy() });
    gsap.to(player.sprite.scale, { x: 1.45, y: 1.45, duration: 0.14, ease: "power2.out" });
    gsap.to(player.sprite, {
      alpha: 0,
      duration: 0.14,
      ease: "power2.out",
      onComplete: () => {
        player.sprite.visible = false;
      },
    });

    winner = player.id === 1 ? 2 : 1;
    statusEl.textContent = `${winner}P 승리! ${player.id}P 과충전 폭발`;
    gsap.fromTo(
      app.stage,
      { x: 0, y: 0 },
      { x: 10, y: -7, duration: 0.05, yoyo: true, repeat: 6, ease: "power1.inOut" }
    );
  }

  function updateChargeState(player) {
    if (!player.chargeActive || !player.alive || winner) return;
    player.chargeSeconds = simTime - player.chargeStart;
    if (player.chargeSeconds >= SELF_DESTRUCT_HOLD) {
      explodePlayer(player);
    }
  }

  function fireFrom(player, chargeSeconds) {
    if (winner || player.cooldown > 0 || !player.alive) return;
    const chargeRatio = clamp(chargeSeconds / MAX_CHARGE_TIME, 0, 1);
    const shotSpeed = lerp(MIN_SHOT_SPEED, MAX_SHOT_SPEED, chargeRatio);
    const shotLife = lerp(0.62, 1.75, chargeRatio);

    const startX = player.x + player.dirX * 34;
    const startY = player.y + player.dirY * 34;
    const shot = {
      owner: player.id,
      x: startX,
      y: startY,
      prevX: startX,
      prevY: startY,
      dx: player.dirX,
      dy: player.dirY,
      speed: shotSpeed,
      age: 0,
      life: shotLife,
      phase: Math.random() * Math.PI * 2,
      trail: [],
      gfx: new PIXI.Graphics(),
    };
    shotLayer.addChild(shot.gfx);
    shots.push(shot);
    player.cooldown = FIRE_COOLDOWN;
    spawnMuzzle(player);
  }

  function updatePlayer(player, dt) {
    if (!player.alive) return;
    const c = player.controls;
    const playerKeys = (gameMode === "local") ? keys : (player.id === 1 ? player0Keys : player1Keys);
    let mx = 0;
    let my = 0;
    if (playerKeys.has(c.left)) mx -= 1;
    if (playerKeys.has(c.right)) mx += 1;
    if (playerKeys.has(c.up)) my -= 1;
    if (playerKeys.has(c.down)) my += 1;

    if (mx !== 0 || my !== 0) {
      const d = norm(mx, my);
      player.x += d.x * PLAYER_SPEED * dt;
      player.y += d.y * PLAYER_SPEED * dt;
      player.dirX = d.x;
      player.dirY = d.y;
    }

    player.x = clamp(player.x, 30, W - 30);
    player.y = clamp(player.y, 30, H - 30);
    player.cooldown = Math.max(0, player.cooldown - dt);

    let jitterX = 0;
    let jitterY = 0;
    if (player.chargeActive && player.chargeSeconds >= MAX_CHARGE_TIME) {
      const extra = Math.min(2.2, (player.chargeSeconds - MAX_CHARGE_TIME) * 2.1);
      const amp = 2.8 + extra;
      jitterX = Math.sin(simTime * 90 + player.id * 0.9) * amp;
      jitterY = Math.cos(simTime * 106 + player.id * 1.3) * amp;
    }

    player.sprite.x = player.x + jitterX;
    player.sprite.y = player.y + jitterY;
    updateHamsterSpear(player.sprite, player.dirX, player.dirY);
  }

  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i -= 1) {
      const s = shots[i];
      s.prevX = s.x;
      s.prevY = s.y;
      s.x += s.dx * s.speed * dt;
      s.y += s.dy * s.speed * dt;
      s.life -= dt;
      s.age += dt;

      let bounced = false;
      if (s.x <= WALL_BOUNCE_MARGIN) {
        s.x = WALL_BOUNCE_MARGIN;
        s.dx = Math.abs(s.dx);
        bounced = true;
      } else if (s.x >= W - WALL_BOUNCE_MARGIN) {
        s.x = W - WALL_BOUNCE_MARGIN;
        s.dx = -Math.abs(s.dx);
        bounced = true;
      }

      if (s.y <= WALL_BOUNCE_MARGIN) {
        s.y = WALL_BOUNCE_MARGIN;
        s.dy = Math.abs(s.dy);
        bounced = true;
      } else if (s.y >= H - WALL_BOUNCE_MARGIN) {
        s.y = H - WALL_BOUNCE_MARGIN;
        s.dy = -Math.abs(s.dy);
        bounced = true;
      }

      if (bounced) {
        const n = norm(s.dx, s.dy);
        s.dx = n.x;
        s.dy = n.y;
      }

      s.trail.push({ x: s.x, y: s.y, a: 1 });
      for (const t of s.trail) t.a -= dt * 5;
      while (s.trail.length > 10 || (s.trail[0] && s.trail[0].a <= 0)) s.trail.shift();

      drawShot(s);

      const target = players[s.owner === 1 ? 1 : 0];
      if (shotVsHamsterPrecise(s, target)) {
        winner = s.owner;
        statusEl.textContent = `${winner}P 승리! R 키로 재시작`;
        makeBurst(fxLayer, s.x, s.y, target.hitColor);
        gsap.fromTo(
          app.stage,
          { x: 0, y: 0 },
          { x: 6, y: -4, duration: 0.04, yoyo: true, repeat: 5, ease: "power1.inOut" }
        );
        return;
      }

      if (s.life <= 0) {
        s.gfx.destroy();
        shots.splice(i, 1);
      }
    }
  }

  function resetGame() {
    simTime = 0;

    players[0].x = 150;
    players[0].y = H / 2;
    players[0].dirX = 1;
    players[0].dirY = 0;
    players[0].cooldown = 0;
    players[0].alive = true;
    players[0].chargeActive = false;
    players[0].chargeStart = 0;
    players[0].chargeSeconds = 0;
    players[0].sprite.visible = true;
    players[0].sprite.alpha = 1;
    players[0].sprite.scale.set(1, 1);

    players[1].x = W - 150;
    players[1].y = H / 2;
    players[1].dirX = -1;
    players[1].dirY = 0;
    players[1].cooldown = 0;
    players[1].alive = true;
    players[1].chargeActive = false;
    players[1].chargeStart = 0;
    players[1].chargeSeconds = 0;
    players[1].sprite.visible = true;
    players[1].sprite.alpha = 1;
    players[1].sprite.scale.set(1, 1);

    for (const s of shots) s.gfx.destroy();
    shots.length = 0;
    winner = null;
    statusEl.textContent = "대결 시작!";
  }

  function ensureBgmPlayback() {
    if (bgmStarted) return;
    bgmStarted = true;
    bgmAudio.play().catch(() => {
      bgmStarted = false;
    });
  }

  window.addEventListener("keydown", (e) => {
    ensureBgmPlayback();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "KeyR") {
      if (gameMode === "local") {
        resetGame();
      } else if ((gameMode === "online-host" || gameMode === "online-guest") && winner) {
        if (gameMode === "online-host") {
          networkManager.sendReset();
        }
        resetGame();
      }
      return;
    }
    if (e.repeat) return;

    if (gameMode === "local") {
      keys.add(e.code);
      if (e.code === players[0].controls.fire && players[0].alive && !winner) {
        players[0].chargeActive = true;
        players[0].chargeStart = simTime;
        players[0].chargeSeconds = 0;
      }
      if (e.code === players[1].controls.fire && players[1].alive && !winner) {
        players[1].chargeActive = true;
        players[1].chargeStart = simTime;
        players[1].chargeSeconds = 0;
      }
    } else if (gameMode === "online-host") {
      const p0Controls = players[0].controls;
      if (Object.values(p0Controls).includes(e.code)) {
        player0Keys.add(e.code);
        networkManager.sendInput("keydown", e.code);
        if (e.code === p0Controls.fire && players[0].alive && !winner) {
          players[0].chargeActive = true;
          players[0].chargeStart = simTime;
          players[0].chargeSeconds = 0;
        }
      }
    } else if (gameMode === "online-guest") {
      const p1Controls = players[1].controls;
      if (Object.values(p1Controls).includes(e.code)) {
        player1Keys.add(e.code);
        networkManager.sendInput("keydown", e.code);
        if (e.code === p1Controls.fire && players[1].alive && !winner) {
          players[1].chargeActive = true;
          players[1].chargeStart = simTime;
          players[1].chargeSeconds = 0;
        }
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (gameMode === "local") {
      keys.delete(e.code);
      if (e.code === players[0].controls.fire && players[0].chargeActive) {
        const held = simTime - players[0].chargeStart;
        players[0].chargeActive = false;
        players[0].chargeSeconds = 0;
        if (players[0].alive && !winner && held < SELF_DESTRUCT_HOLD) {
          fireFrom(players[0], held);
        }
      }
      if (e.code === players[1].controls.fire && players[1].chargeActive) {
        const held = simTime - players[1].chargeStart;
        players[1].chargeActive = false;
        players[1].chargeSeconds = 0;
        if (players[1].alive && !winner && held < SELF_DESTRUCT_HOLD) {
          fireFrom(players[1], held);
        }
      }
    } else if (gameMode === "online-host") {
      const p0Controls = players[0].controls;
      if (Object.values(p0Controls).includes(e.code)) {
        player0Keys.delete(e.code);
        networkManager.sendInput("keyup", e.code);
        if (e.code === p0Controls.fire && players[0].chargeActive) {
          const held = simTime - players[0].chargeStart;
          players[0].chargeActive = false;
          players[0].chargeSeconds = 0;
          if (players[0].alive && !winner && held < SELF_DESTRUCT_HOLD) {
            fireFrom(players[0], held);
          }
        }
      }
    } else if (gameMode === "online-guest") {
      const p1Controls = players[1].controls;
      if (Object.values(p1Controls).includes(e.code)) {
        player1Keys.delete(e.code);
        networkManager.sendInput("keyup", e.code);
        if (e.code === p1Controls.fire && players[1].chargeActive) {
          const held = simTime - players[1].chargeStart;
          players[1].chargeActive = false;
          players[1].chargeSeconds = 0;
          if (players[1].alive && !winner && held < SELF_DESTRUCT_HOLD) {
            fireFrom(players[1], held);
          }
        }
      }
    }
  });

  window.addEventListener("pointerdown", ensureBgmPlayback, { passive: true });

  if (gameMode === "online-host") {
    networkManager.onInputReceived = (data) => {
      console.log('[HOST] Received from guest:', data.eventType, data.code);
      if (data.eventType === "keydown") {
        player1Keys.add(data.code);
        if (data.code === players[1].controls.fire && players[1].alive && !winner) {
          players[1].chargeActive = true;
          players[1].chargeStart = simTime;
          players[1].chargeSeconds = 0;
        }
      } else if (data.eventType === "keyup") {
        player1Keys.delete(data.code);
        if (data.code === players[1].controls.fire && players[1].chargeActive) {
          const held = simTime - players[1].chargeStart;
          players[1].chargeActive = false;
          players[1].chargeSeconds = 0;
          if (players[1].alive && !winner && held < SELF_DESTRUCT_HOLD) {
            fireFrom(players[1], held);
          }
        }
      }
    };
  } else if (gameMode === "online-guest") {
    networkManager.onInputReceived = (data) => {
      console.log('[GUEST] Received from host:', data.eventType, data.code);
      if (data.eventType === "keydown") {
        player0Keys.add(data.code);
        if (data.code === players[0].controls.fire && players[0].alive && !winner) {
          players[0].chargeActive = true;
          players[0].chargeStart = simTime;
          players[0].chargeSeconds = 0;
        }
      } else if (data.eventType === "keyup") {
        player0Keys.delete(data.code);
        if (data.code === players[0].controls.fire && players[0].chargeActive) {
          const held = simTime - players[0].chargeStart;
          players[0].chargeActive = false;
          players[0].chargeSeconds = 0;
          if (players[0].alive && !winner && held < SELF_DESTRUCT_HOLD) {
            fireFrom(players[0], held);
          }
        }
      }
    };
    
    networkManager.onResetReceived = () => {
      resetGame();
    };
  }

  resetGame();

  const guideEl = document.querySelector(".guide");
  if (gameMode === "local") {
    guideEl.textContent = "1P: WASD + Left Shift | 2P: Arrow Keys + Right Shift | R: 재시작";
  } else {
    guideEl.textContent = "조작: WASD + Left Shift | R: 게임 종료 후 재시작 가능";
  }

  app.ticker.add((ticker) => {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    accumulator += dt;

    while (accumulator >= FIXED_STEP) {
      simTime += FIXED_STEP;
      if (!winner) {
        updateChargeState(players[0]);
        updateChargeState(players[1]);
        updatePlayer(players[0], FIXED_STEP);
        updatePlayer(players[1], FIXED_STEP);
        updateShots(FIXED_STEP);
      }
      accumulator -= FIXED_STEP;
    }
  });
}

function initMenu() {
  const btnLocal = document.getElementById("btn-local");
  const btnCreateRoom = document.getElementById("btn-create-room");
  const btnJoinRoom = document.getElementById("btn-join-room");
  const btnJoinConfirm = document.getElementById("btn-join-confirm");
  const btnJoinCancel = document.getElementById("btn-join-cancel");
  const btnCopyLink = document.getElementById("btn-copy-link");
  const btnLeave = document.getElementById("btn-leave");
  
  const joinInputContainer = document.getElementById("join-input-container");
  const roomIdInput = document.getElementById("room-id-input");
  const roomInfo = document.getElementById("room-info");
  const inviteLink = document.getElementById("invite-link");
  const waitingText = document.getElementById("waiting-text");

  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');

  if (roomParam) {
    joinRoom(roomParam);
    return;
  }

  btnLocal.addEventListener("click", () => {
    gameMode = "local";
    startGame();
  });

  btnCreateRoom.addEventListener("click", async () => {
    try {
      gameMode = "online-host";
      btnCreateRoom.disabled = true;
      btnCreateRoom.textContent = "방 생성 중...";
      
      await networkManager.createRoom();
      inviteLink.value = networkManager.getInviteLink();
      roomInfo.style.display = "block";
      
      networkManager.onConnected = () => {
        waitingText.style.display = "none";
        startGame();
      };

      networkManager.onDisconnected = () => {
        alert("상대방과의 연결이 끊어졌습니다.");
        returnToMenu();
      };
    } catch (err) {
      alert("방 생성 실패: " + err.message);
      btnCreateRoom.disabled = false;
      btnCreateRoom.textContent = "온라인 - 방 만들기";
    }
  });

  btnJoinRoom.addEventListener("click", () => {
    joinInputContainer.style.display = "block";
    roomIdInput.focus();
  });

  btnJoinCancel.addEventListener("click", () => {
    joinInputContainer.style.display = "none";
    roomIdInput.value = "";
  });

  btnJoinConfirm.addEventListener("click", () => {
    const roomId = roomIdInput.value.trim().toUpperCase();
    if (roomId) {
      joinRoom(roomId);
    }
  });

  roomIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      btnJoinConfirm.click();
    }
  });

  btnCopyLink.addEventListener("click", () => {
    inviteLink.select();
    navigator.clipboard.writeText(inviteLink.value);
    btnCopyLink.textContent = "복사 완료!";
    setTimeout(() => {
      btnCopyLink.textContent = "복사";
    }, 2000);
  });

  btnLeave.addEventListener("click", () => {
    returnToMenu();
  });

  async function joinRoom(roomId) {
    try {
      gameMode = "online-guest";
      menuEl.style.display = "none";
      gameContainer.style.display = "block";
      statusEl.textContent = "연결 중...";

      await networkManager.joinRoom(roomId);
      
      networkManager.onConnected = () => {
        statusEl.textContent = "연결 완료! 게임 시작!";
        startGame();
      };

      networkManager.onDisconnected = () => {
        alert("호스트와의 연결이 끊어졌습니다.");
        returnToMenu();
      };
    } catch (err) {
      alert("방 참여 실패: " + err.message);
      returnToMenu();
    }
  }

  function startGame() {
    menuEl.style.display = "none";
    gameContainer.style.display = "block";
    boot();
  }

  function returnToMenu() {
    networkManager.disconnect();
    if (gameInstance && gameInstance.app) {
      gameInstance.app.destroy(true);
    }
    gameRoot.innerHTML = "";
    gameContainer.style.display = "none";
    menuEl.style.display = "block";
    
    document.getElementById("room-info").style.display = "none";
    document.getElementById("join-input-container").style.display = "none";
    document.getElementById("room-id-input").value = "";
    document.getElementById("btn-create-room").disabled = false;
    document.getElementById("btn-create-room").textContent = "온라인 - 방 만들기";
    document.getElementById("waiting-text").style.display = "block";
    
    gameMode = null;
  }
}

initMenu();
