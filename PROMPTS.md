# The sitting: prompts and footage

The hero is a 20-second shot of Leonardo da Vinci painting Carlos. The camera walks a full circle round the workshop, and scrolling plays it forward and back. The footage lives in `assets/sitting/` as numbered frames.

## Swapping in new footage

From the repo root:

```bash
swift tools/make-frames.swift "/path/to/new-video.mp4"
```

That rewrites `assets/sitting/desktop/`, `assets/sitting/mobile/` and `frames.json`. Nothing else needs to change. If the new clip is a different length, adjust the note timings (`data-from` / `data-to`, in seconds) in `index.html`.

The current hero is the Kling 3.0 Turbo clip (15 s). The close-up interlude is cut from the earlier Wan 3.0 Prime clip:

```bash
swift tools/make-frames.swift wan.mp4 10 assets/closeup 11.5 14.6
```

---

## 1 · The opening photo (Nano Banana Pro)

Attach your photo, then:

```
Photorealistic cinematic film still, wide 16:9. Leonardo da Vinci's workshop
in Florence, 1503. Warm afternoon light pours through a tall arched window on
the left, dust floating in the beam.

Left third: Leonardo da Vinci, about 60, long wavy grey-white beard, dark red
beret, deep rose-red robe, standing at a wooden easel, brush raised, studying
his model. The canvas faces the camera at an angle and shows an unfinished oil
portrait of the seated young man, in Leonardo's sfumato style, the lower part
still bare canvas with charcoal underdrawing.

Right third: the model is me. Use the attached photo for my face and keep an
exact likeness. I sit on a carved wooden chair in a black suit, three-quarter
view, chin slightly raised, calm and still.

Around us: plaster walls with red-chalk sketches pinned up, shelves of pigment
jars, brushes in cups, a wooden flying-machine model hanging from the beams.
Eye-level camera, 35mm lens, shallow depth of field, subtle film grain.
No text, no watermark.
```

---

## 2 · The orbit (Kling 3.0 Turbo)

**Start frame:** the opening photo. **End frame:** the same photo, so the circle closes exactly where it began. Set the longest duration available (ideally 15–20 s), 16:9, 1080p.

```
Leonardo da Vinci paints a portrait of the seated young man in the black suit
in his candle-and-window-lit Florence workshop.

Camera: one continuous 360-degree orbit to the right around the easel, at
constant eye level and slow, steady speed, like a dolly on a circular track.
No cuts, no zoom, no shake. The camera passes behind the young man's chair,
continues round to the far wall (heavy wooden door, worktable with books, a
skull and candles), passes over Leonardo's shoulder so the unfinished portrait
fills the frame, and completes the circle on the opening view.

Leonardo keeps painting with small, careful strokes, glancing between canvas
and model. The young man holds his pose, breathing and blinking naturally.
Dust drifts in the window light. Faces, clothes, the painting and every prop
stay the same throughout. Photorealistic, cinematic, warm film grain.
```

**Negative prompt:**
```
morphing face, identity change, duplicate person, extra people, mirrored room,
warped hands, painting changes, Mona Lisa, flicker, jump cut, zoom, shake,
cartoon, text, watermark
```

### If the full circle won't hold together
Kling, like every current model, struggles most on the far side of a full orbit. Two fallbacks:

- **Fix only the second half of the Wan clip.** Start frame: `start-frame-9.5s.png` (exported from the Wan video). End frame: the opening photo. Duration 10 s. Use the prompt above, but replace the Camera paragraph with:

  ```
  Camera: continue the slow, steady orbit to the right at eye level. Pass
  behind Leonardo's left shoulder so the unfinished portrait fills the frame,
  then glide round and settle on the opening view: Leonardo on the left,
  easel in the middle, the young man seated on the right. No cuts, no zoom.
  ```

  Send me both halves and I'll join them.
- **Four quarter turns**, each 5 s, chained start→end frame through four views of the room (front, behind the chair, far wall, over Leonardo's shoulder).
