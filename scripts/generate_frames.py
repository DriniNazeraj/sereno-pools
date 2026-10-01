#!/usr/bin/env python3
"""
Sereno Pools - ILLUSTRATED fallback hero frame generator (superseded).

The site now uses the designer's AI-generated placeholder renders in public/frames/.
This script therefore writes to /workspace/sereno/frames-illustrated-backup/ by default
(override with FRAMES_OUT=...). It never touches public/frames unless you point it there.

Renders a stylised, fixed-camera illustration of one backyard being built
(lawn + staked outline -> excavation + rebar -> shell, tile, coping, deck ->
water fill) as a WebP image sequence for the scroll-to-build hero.

PLACEHOLDER ART: replace with real photo/3D frames later (see README).

Usage:  python3 scripts/generate_frames.py [--only desktop|mobile] [--preview t1,t2,...]
Output: $FRAMES_OUT/desktop/frame_001.webp ... (120, 1920x1080)
        $FRAMES_OUT/mobile/frame_001.webp  ... (60, 1080x1350)
        $FRAMES_OUT/og-image-illustrated.jpg (1200x630, final frame)
"""
import argparse, math, os, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("FRAMES_OUT", "/workspace/sereno/frames-illustrated-backup")
SS = 2  # supersampling for polygon masks

SETS = {
    # name: (width, height, frames, focal px, principal y fraction, webp quality)
    "desktop": dict(W=1920, H=1080, N=120, F=1750, cy=0.47, q=72),
    "mobile": dict(W=1080, H=1350, N=60, F=1560, cy=0.53, q=66),
}

CAM_Y, PITCH = 8.4, math.radians(25.5)
X0, X1, Z0, Z1 = -2.6, 2.6, 10.5, 20.0      # pool footprint (metres)
ZB = 29.0                                    # back hedge line
HEDGE_H = 2.4
DEPTH = 1.7

def hexc(h):
    h = h.lstrip("#"); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], np.float32) / 255.0

C = dict(
    lawn_a=hexc("#5A8048"), lawn_b=hexc("#4F7540"), lawn_far=hexc("#3A5E38"),
    hedge=hexc("#1E3F2A"), hedge_hi=hexc("#2E5A38"), tree=hexc("#173424"), tree_hi=hexc("#2A4F35"),
    sky_top=hexc("#DCE6E4"), sky_low=hexc("#F4EFE5"),
    soil=hexc("#8A6A4C"), soil_dark=hexc("#5E4531"), soil_light=hexc("#A98463"),
    concrete=hexc("#B9B4AA"), plaster=hexc("#E6EEEC"), rebar=hexc("#8C4B2A"),
    tile=hexc("#2C6F7E"), coping=hexc("#EDE5D6"), deck=hexc("#DCD2C0"), deck_joint=hexc("#C4B8A3"),
    water_shallow=hexc("#74C6C8"), water_deep=hexc("#2A7F95"), string=hexc("#F6F1E6"),
    cushion=hexc("#F7F3EA"), frame=hexc("#3B3A36"), shrub=hexc("#2B5A36"), shrub_hi=hexc("#3F7A47"),
    pot=hexc("#CFC4B0"),
)

def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)

def sss(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0); return t * t * (3 - 2 * t)

class Cam:
    def __init__(s, W, H, F, cy):
        s.W, s.H, s.F, s.cy = W, H, F, cy * H
        s.cp, s.sp = math.cos(PITCH), math.sin(PITCH)
    def proj(s, x, y, z, scale=1.0):
        dy, dz = y - CAM_Y, z
        cy = dy * s.cp + dz * s.sp
        cz = -dy * s.sp + dz * s.cp
        return ((s.W / 2 + s.F * x / cz) * scale, (s.cy - s.F * cy / cz) * scale)
    def rays(s):
        xs = (np.arange(s.W, dtype=np.float32) + 0.5 - s.W / 2) / s.F
        ys = (s.cy - (np.arange(s.H, dtype=np.float32) + 0.5)) / s.F
        u, v = np.meshgrid(xs, ys)
        # camera -> world direction; camera forward f=(0,-sp,cp), up=(0,cp,sp)
        dx = u
        dy = -s.sp + v * s.cp
        dz = s.cp + v * s.sp
        return dx, dy, dz
    def plane(s, y0):
        dx, dy, dz = s.rays()
        with np.errstate(divide="ignore", invalid="ignore"):
            t = (y0 - CAM_Y) / dy
        t = np.where(dy < 0, t, np.inf)
        return dx * t, dz * t, t

def noise(shape, scale, seed, octaves=3):
    rng = np.random.default_rng(seed)
    H, W = shape; out = np.zeros(shape, np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        sh = (max(2, int(H / scale) + 2), max(2, int(W / scale) + 2))
        small = rng.random(sh).astype(np.float32)
        img = Image.fromarray((small * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
        out += np.asarray(img, np.float32) / 255.0 * amp; tot += amp
        amp *= 0.5; scale /= 2.2
    return out / tot

class Scene:
    def __init__(s, name):
        p = SETS[name]; s.name = name
        s.W, s.H = p["W"], p["H"]
        s.cam = Cam(s.W, s.H, p["F"], p["cy"])
        s.build_static()

    # ---------- helpers
    def poly_mask(s, pts3d, blur=0):
        im = Image.new("L", (s.W * SS, s.H * SS), 0)
        d = ImageDraw.Draw(im)
        d.polygon([s.cam.proj(*p, scale=SS) for p in pts3d], fill=255)
        im = im.resize((s.W, s.H), Image.BOX)
        if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
        return np.asarray(im, np.float32) / 255.0
    def lines_mask(s, segs, width):
        im = Image.new("L", (s.W * SS, s.H * SS), 0)
        d = ImageDraw.Draw(im)
        for a, b in segs:
            d.line([s.cam.proj(*a, scale=SS), s.cam.proj(*b, scale=SS)], fill=255, width=max(1, int(width * SS)))
        im = im.resize((s.W, s.H), Image.BOX)
        return np.asarray(im, np.float32) / 255.0
    def rect(s, x0, x1, z0, z1, y=0.0):
        return [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]
    def ring(s, outer, inner, blur=0):
        return np.clip(s.poly_mask(outer, blur) - s.poly_mask(inner, blur), 0, 1)

    # ---------- static layers
    def build_static(s):
        W, H = s.W, s.H
        gx, gz, gt = s.cam.plane(0.0)
        dx, dy, dz = s.cam.rays()
        s.gx, s.gz = gx, gz
        n1 = noise((H, W), 220, 1); n2 = noise((H, W), 26, 2, 2); s.n_fine = noise((H, W), 6, 3, 2)
        s.n1, s.n2 = n1, n2
        # lawn with mowing stripes (along z), soft blotches, atmospheric fade
        stripe = 0.5 + 0.5 * np.tanh(np.sin(np.pi * gx / 1.35) * 1.6)
        lawn = C["lawn_b"][None, None] * (1 - stripe[..., None]) + C["lawn_a"][None, None] * stripe[..., None]
        far = ss(12, 30, np.nan_to_num(gz, posinf=60))[..., None]
        lawn = lawn * (1 - 0.45 * far) + C["lawn_far"] * 0.45 * far
        lawn *= (0.9 + 0.16 * n1[..., None] + 0.06 * (n2[..., None] - 0.5) + 0.03 * (s.n_fine[..., None] - 0.5))
        # back hedge (vertical plane at z=ZB) + trees + sky
        with np.errstate(divide="ignore", invalid="ignore"):
            tw = ZB / dz
        yw = CAM_Y + tw * dy; xw = dx * tw
        is_ground = np.isfinite(gz) & (gz < ZB)
        hedge_top = HEDGE_H + 0.12 * np.sin(xw * 3.1) + 0.08 * np.sin(xw * 7.3 + 1)
        is_hedge = (~is_ground) & (yw < hedge_top)
        hn = noise((H, W), 14, 5, 3)
        hedge = C["hedge"] * (1 - hn[..., None] * 0.6) + C["hedge_hi"] * hn[..., None] * 0.6
        hedge *= (0.75 + 0.35 * ss(0, HEDGE_H, yw))[..., None]
        # trees: canopy silhouette above hedge
        rng = np.random.default_rng(21)
        canopy_h = np.full_like(xw, HEDGE_H)
        for xc in np.arange(-40, 40, 2.3):
            xc2 = xc + rng.uniform(-0.8, 0.8); r = rng.uniform(1.6, 2.8); base = rng.uniform(2.2, 3.6)
            canopy_h = np.maximum(canopy_h, base + np.sqrt(np.clip(r * r - (xw - xc2) ** 2, 0, None)))
        tn = noise((H, W), 18, 7, 3)
        is_tree = (~is_ground) & (~is_hedge) & (yw < canopy_h + (tn - 0.5) * 0.25)
        tree = C["tree"] * (1 - tn[..., None]) + C["tree_hi"] * tn[..., None]
        skyk = np.clip((np.arange(H, dtype=np.float32) / H)[:, None, None] * 2.2, 0, 1) * np.ones((1, W, 1), np.float32)
        sky = C["sky_top"] * (1 - skyk) + C["sky_low"] * skyk
        img = np.where(is_ground[..., None], lawn, np.where(is_hedge[..., None], hedge, np.where(is_tree[..., None], tree, sky)))
        # contact shadow at hedge base
        base_sh = ss(ZB - 3.5, ZB, np.nan_to_num(gz, posinf=0)) * is_ground
        img *= (1 - 0.35 * base_sh[..., None])
        # soft depth-of-field on the far background
        far_k = np.clip(np.where(is_ground, ss(18, ZB, np.nan_to_num(gz, posinf=ZB)), 1.0), 0, 1)[..., None]
        blurred = np.asarray(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2 * W / 1920)), np.float32) / 255.0
        img = img * (1 - far_k) + blurred * far_k
        s.base = img.astype(np.float32)
        # soil textures
        s.soil = (C["soil"] * (0.85 + 0.3 * n2[..., None]) + (s.n_fine[..., None] - 0.5) * 0.06).astype(np.float32)
        s.concrete = (C["concrete"] * (0.92 + 0.12 * n2[..., None]) + (s.n_fine[..., None] - 0.5) * 0.03).astype(np.float32)
        s.plaster = (C["plaster"] * (0.97 + 0.05 * n1[..., None])).astype(np.float32)
        # deck pavers (world-aligned 0.9 x 0.6 m, running bond)
        gxz = np.nan_to_num(gx); gzz = np.nan_to_num(gz)
        row = np.floor(gzz / 0.6)
        jx = np.abs(((gxz + (row % 2) * 0.45) / 0.9) % 1 - 0.5) * 0.9
        jz = np.abs((gzz / 0.6) % 1 - 0.5) * 0.6
        joint = np.maximum(ss(0.43, 0.445, jx), ss(0.285, 0.296, jz))
        pv = noise((H, W), 60, 11, 2)
        deck = C["deck"] * (0.94 + 0.1 * pv[..., None])
        s.deck = (deck * (1 - joint[..., None] * 0.55) + C["deck_joint"] * joint[..., None] * 0.55).astype(np.float32)
        # masks
        s.m_open = s.poly_mask(s.rect(X0, X1, Z0, Z1))
        s.m_coping = s.ring(s.rect(X0 - .38, X1 + .38, Z0 - .38, Z1 + .38), s.rect(X0, X1, Z0, Z1))
        s.m_deck = s.ring(s.rect(X0 - 2.3, X1 + 4.2, Z0 - 1.6, Z1 + 1.8), s.rect(X0 - .38, X1 + .38, Z0 - .38, Z1 + .38))
        s.m_dirt = np.clip(s.poly_mask(s.rect(X0 - 1.9, X1 + 1.9, Z0 - 1.3, Z1 + 1.3), blur=5) * (0.75 + 0.5 * noise((H, W), 40, 9, 2)) - s.m_open, 0, 1)
        s.m_rim = np.clip(s.m_open - s.poly_mask(s.rect(X0 + .12, X1 - .12, Z0 + .25, Z1 - .08), blur=6), 0, 1)
        s.m_deck_shadow = np.clip(s.poly_mask(s.rect(X0 - 2.2, X1 + 4.3, Z0 - 1.5, Z1 + 1.9), blur=14) - s.poly_mask(s.rect(X0 - 2.3, X1 + 4.2, Z0 - 1.6, Z1 + 1.8)), 0, 1)
        # vignette
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.55) / (H * 0.75)) ** 2)
        s.vig = (1 - 0.32 * ss(0.55, 1.25, r))[..., None].astype(np.float32)
        s.sun = np.exp(-(((xx - W * 0.15) / (W * 0.55)) ** 2 + ((yy + H * 0.05) / (H * 0.6)) ** 2))[..., None].astype(np.float32)

    # ---------- frame
    def render(s, t):
        img = s.base.copy()
        def comp(mask, color, a=1.0):
            nonlocal img
            if a <= 0.001: return
            m = (mask * a)[..., None]
            img = img * (1 - m) + color * m

        a_dirt = sss(0.24, 0.32, t) * (1 - sss(0.62, 0.72, t))
        comp(s.m_dirt, s.soil * 1.05, a_dirt * 0.85)

        # excavation mounds (beside the pool, grow then shrink)
        a_mound = sss(0.27, 0.42, t) * (1 - sss(0.55, 0.66, t))
        if a_mound > 0.01:
            for (mx, mz, rr) in [(X0 - 1.4, Z0 + 2.5, 1.0), (X0 - 1.5, Z0 + 6.0, 1.2), (X1 + 1.5, Z0 + 4.0, 1.1), (X1 + 1.4, Z1 - 1.0, 0.9)]:
                px, py = s.cam.proj(mx, 0, mz)
                px2, _ = s.cam.proj(mx + rr, 0, mz)
                rad = (px2 - px) * a_mound
                if rad < 2: continue
                h = rad * 0.75
                yy, xx = np.ogrid[0:s.H, 0:s.W]
                d = ((xx - px) / rad) ** 2 + ((yy - py) / (h * 0.9)) ** 2
                m = np.clip(1 - d, 0, 1) ** 0.6
                m = m * (yy < py + h * 0.3)
                shade = np.clip(0.75 + 0.5 * (-(yy - py) / h) - 0.25 * ((xx - px) / rad), 0.55, 1.3)
                img = img * (1 - m[..., None]) + (s.soil * shade[..., None]) * m[..., None]

        # ----- pool interior
        D = DEPTH * sss(0.26, 0.45, t)
        concrete_k = sss(0.50, 0.58, t); plaster_k = sss(0.70, 0.77, t)
        mat = s.soil * (1 - concrete_k) + s.concrete * concrete_k
        mat = mat * (1 - plaster_k) + s.plaster * plaster_k
        hole = mat * 0.8
        if D > 0.02:
            faces = [
                (s.rect(X0, X1, Z0, Z1, -D), 0.92),                                   # floor
                ([(X0, 0, Z1), (X1, 0, Z1), (X1, -D, Z1), (X0, -D, Z1)], 0.82),       # far wall
                ([(X0, 0, Z0), (X0, 0, Z1), (X0, -D, Z1), (X0, -D, Z0)], 0.62),       # left wall (shade)
                ([(X1, 0, Z0), (X1, 0, Z1), (X1, -D, Z1), (X1, -D, Z0)], 1.02),       # right wall (lit)
            ]
            for pts, k in faces:
                m = s.poly_mask(pts)[..., None]
                hole = hole * (1 - m) + mat * k * m
            # soft shadow cast by left rim on floor
            sh = s.poly_mask(s.rect(X0, X0 + 0.9 * (D / DEPTH) + 0.05, Z0, Z1, -D), blur=10)
            hole *= (1 - 0.22 * sh[..., None])
            a_reb = sss(0.39, 0.47, t) * (1 - sss(0.52, 0.575, t))
            if a_reb > 0.01:
                segs = []; st = 0.32
                for x in np.arange(X0 + st, X1, st): segs.append(((x, -D, Z0), (x, -D, Z1))); segs.append(((x, 0, Z1), (x, -D, Z1)))
                for z in np.arange(Z0 + st, Z1, st): segs.append(((X0, -D, z), (X1, -D, z))); segs.append(((X0, 0, z), (X0, -D, z))); segs.append(((X1, 0, z), (X1, -D, z)))
                for y in np.arange(-st, -D, -st):
                    segs.append(((X0, y, Z1), (X1, y, Z1))); segs.append(((X0, y, Z0), (X0, y, Z1))); segs.append(((X1, y, Z0), (X1, y, Z1)))
                lm = s.lines_mask(segs, 1.6 if s.W > 1500 else 1.3)
                hole = hole * (1 - lm[..., None] * a_reb) + C["rebar"] * lm[..., None] * a_reb
            a_tile = sss(0.58, 0.65, t)
            if a_tile > 0.01:
                band = 0.2
                for pts, k in [
                    ([(X0, 0, Z1), (X1, 0, Z1), (X1, -band, Z1), (X0, -band, Z1)], 0.9),
                    ([(X0, 0, Z0), (X0, 0, Z1), (X0, -band, Z1), (X0, -band, Z0)], 0.7),
                    ([(X1, 0, Z0), (X1, 0, Z1), (X1, -band, Z1), (X1, -band, Z0)], 1.05)]:
                    m = s.poly_mask(pts)[..., None] * a_tile
                    tile = C["tile"] * k * (0.9 + 0.2 * s.n2[..., None])
                    hole = hole * (1 - m) + tile * m
            # water
            w = sss(0.765, 0.95, t)
            if w > 0.005:
                h = -D + w * (D - 0.14)
                m = s.poly_mask(s.rect(X0, X1, Z0, Z1, h))
                px, pz, _ = s.cam.plane(h)
                px = np.nan_to_num(px); pz = np.nan_to_num(pz)
                depth_k = np.clip((pz - Z0) / (Z1 - Z0), 0, 1)
                col = C["water_shallow"] * (1 - depth_k[..., None] * 0.55) + C["water_deep"] * depth_k[..., None] * 0.55
                ph = t * 38.0
                a = np.sin(px * 5.1 + pz * 1.3 + ph) + np.sin(px * -2.3 + pz * 4.7 + ph * 0.8) + np.sin(px * 3.7 - pz * 3.1 - ph * 1.1)
                v1 = np.abs(np.sin(px * 4.2 + 1.3 * np.sin(pz * 2.9 + ph)))
                v2 = np.abs(np.sin(pz * 3.6 + 1.2 * np.sin(px * 3.3 - ph * 0.9)))
                caus = np.clip((1 - v1) ** 7 + (1 - v2) ** 7, 0, 1) * (0.7 + 0.3 * np.sin(a))
                caus_k = 0.15 + 0.85 * sss(0.8, 1.0, t)
                col = col * (1 + 0.22 * caus[..., None] * caus_k)
                # sky reflection sheen on far half
                sheen = ss(0.45, 1.0, depth_k)[..., None] * 0.18
                col = col * (1 - sheen) + hexc("#E8F3F0") * sheen
                alpha = (0.55 + 0.4 * w)
                mm = (m * alpha)[..., None]
                hole = hole * (1 - mm) + col * mm
                # waterline darkening on walls just above the surface
            # rim shadow along far/side top edges
        hole *= (1 - 0.22 * s.m_rim[..., None] * sss(0.3, 0.5, t))
        comp(s.m_open, hole, sss(0.235, 0.29, t))

        # deck + coping
        a_deck = sss(0.66, 0.75, t)
        if a_deck > 0.01:
            img *= (1 - 0.25 * s.m_deck_shadow[..., None] * a_deck)
            comp(s.m_deck, s.deck, a_deck)
        a_cop = sss(0.62, 0.70, t)
        comp(s.m_coping, C["coping"] * (0.97 + 0.06 * s.n1[..., None]), a_cop)

        # staked outline (stage 1)
        a_str = sss(0.04, 0.16, t) * (1 - sss(0.27, 0.33, t))
        if a_str > 0.01:
            corners = [(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)]
            segs = [((corners[i][0], 0.02, corners[i][1]), (corners[(i + 1) % 4][0], 0.02, corners[(i + 1) % 4][1])) for i in range(4)]
            lm = s.lines_mask(segs, 2.2 if s.W > 1500 else 2.0)
            comp(lm, C["string"], a_str * 0.9)
            stakes = []
            for (x, z) in corners + [((X0 + X1) / 2, Z0), ((X0 + X1) / 2, Z1), (X0, (Z0 + Z1) / 2), (X1, (Z0 + Z1) / 2)]:
                stakes.append(((x, 0, z), (x, 0.45, z)))
            sm = s.lines_mask(stakes, 4.5 if s.W > 1500 else 4.0)
            comp(sm, hexc("#E9D8B4"), a_str)

        # furniture + planters (finish)
        a_f = sss(0.86, 0.97, t)
        if a_f > 0.01:
            for zc in (Z0 + 5.0, Z0 + 2.4):
                xa, xb = X1 + 1.3, X1 + 2.1
                za, zb = zc - 1.0, zc + 1.0
                shm = s.poly_mask(s.rect(xa + 0.15, xb + 0.35, za + 0.1, zb + 0.35), blur=8)
                img *= (1 - 0.3 * shm[..., None] * a_f)
                seat = [(xa, 0.38, za), (xb, 0.38, za), (xb, 0.38, zb - 0.6), (xa, 0.38, zb - 0.6)]
                back = [(xa, 0.38, zb - 0.6), (xb, 0.38, zb - 0.6), (xb, 0.9, zb), (xa, 0.9, zb)]
                front = [(xa, 0.38, za), (xb, 0.38, za), (xb, 0.08, za), (xa, 0.08, za)]
                comp(s.poly_mask(front), C["frame"], a_f)
                comp(s.poly_mask(seat), C["cushion"], a_f)
                comp(s.poly_mask(back), C["cushion"] * 0.9, a_f)
            for (x, z, r) in [(X0 - 1.6, Z0 - 0.9, 0.55), (X0 - 1.6, Z1 + 1.1, 0.6), (X1 + 3.4, Z1 + 1.1, 0.7), (X1 + 3.5, Z0 - 0.8, 0.5)]:
                px, py = s.cam.proj(x, r * 0.9, z); px2, _ = s.cam.proj(x + r, r * 0.9, z)
                rad = px2 - px
                yy, xx = np.ogrid[0:s.H, 0:s.W]
                d = np.sqrt(((xx - px) / rad) ** 2 + ((yy - py) / (rad * 0.85)) ** 2)
                m = ss(1.0, 0.85, d)
                shade = np.clip(1.1 - 0.35 * ((yy - py) / rad) - 0.2 * ((xx - px) / rad), 0.6, 1.3)
                col = (C["shrub"] * (1 - s.n2[..., None]) + C["shrub_hi"] * s.n2[..., None]) * shade[..., None]
                shd = ss(1.4, 0.6, np.sqrt(((xx - px - rad * 0.4) / (rad * 1.3)) ** 2 + ((yy - py - rad * 0.7) / (rad * 0.5)) ** 2))
                img *= (1 - 0.3 * shd[..., None] * a_f)
                comp(m, col, a_f)

        # ----- grading per stage: morning cool -> dusty warm -> neutral -> golden
        k1 = sss(0.2, 0.35, t); k2 = sss(0.45, 0.6, t); k3 = sss(0.72, 0.95, t)
        tint = np.array([0.98, 1.0, 1.02], np.float32)
        tint = tint * (1 - k1) + np.array([1.04, 1.0, 0.94], np.float32) * k1
        tint = tint * (1 - k2) + np.array([1.0, 1.0, 1.0], np.float32) * k2
        tint = tint * (1 - k3) + np.array([1.05, 1.01, 0.96], np.float32) * k3
        img = img * tint
        img = img + s.sun * (0.05 + 0.07 * k3) * np.array([1.0, 0.85, 0.6], np.float32)
        img = img * s.vig
        img = np.clip(img, 0, 1) ** 0.97
        return Image.fromarray((img * 255 + 0.5).astype(np.uint8))

_scene = None
def _init(name):
    global _scene; _scene = Scene(name)
def _job(args):
    i, t, path, q = args
    im = _scene.render(t)
    im.save(path, "WEBP", quality=q, method=6)
    return path, os.path.getsize(path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only"); ap.add_argument("--preview"); ap.add_argument("--procs", type=int, default=4)
    a = ap.parse_args()
    names = [a.only] if a.only else ["desktop", "mobile"]
    if a.preview:
        os.makedirs("/tmp/frames_preview", exist_ok=True)
        for n in names:
            sc = Scene(n)
            for t in [float(x) for x in a.preview.split(",")]:
                sc.render(t).save(f"/tmp/frames_preview/{n}_{t:.2f}.png")
        return
    for n in names:
        p = SETS[n]; d = os.path.join(OUT, n); os.makedirs(d, exist_ok=True)
        for f in os.listdir(d):
            if f.endswith(".webp"): os.remove(os.path.join(d, f))
        jobs = [(i, i / (p["N"] - 1), os.path.join(d, f"frame_{i+1:03d}.webp"), p["q"]) for i in range(p["N"])]
        with Pool(a.procs, initializer=_init, initargs=(n,)) as pool:
            res = pool.map(_job, jobs, chunksize=2)
        tot = sum(sz for _, sz in res)
        print(f"{n}: {len(res)} frames, total {tot/1024:.0f} KB, max {max(sz for _, sz in res)/1024:.1f} KB, first {res[0][1]/1024:.1f} KB")
        if n == "desktop":
            last = Image.open(res[-1][0]).convert("RGB")
            og = last.resize((1200, 675), Image.LANCZOS).crop((0, 22, 1200, 652))
            og.save(os.path.join(OUT, "og-image-illustrated.jpg"), quality=86)

if __name__ == "__main__":
    main()
