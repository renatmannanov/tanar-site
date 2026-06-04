# Step 5 — Findings: Prompts for nano-banana

> Все промпты на английском. Каждый содержит scene-specific описание + Style-Block из Step 4.
> Чтобы избежать дублирования, Style-Block обозначен как `[STYLE-BLOCK]` — при финальной сборке в Step 6 он подставляется inline в каждый промпт.

## 0. Style-block (вставляется в каждый промпт)

```
Style anchor — apply to this image: {LIGHTING}, matte film look with
subtle analog grain, Fujifilm Pro 400H aesthetic. Palette — 70% warm
earth (stone, muted ochre, amber, moss green, dark olive) with 20%
cool graphite shadow and 10% warm snow highlight; no pure black,
no pure white. Location — Central Asian Tian Shan mountains,
Kazakhstani landscape with yellow alpine grass, larch and spruce
forest, rust-ochre Kazakh foothills. Not Swiss Alps, not Rocky
Mountains, not Nordic, not Himalayas. No visible logos, no text,
no brand marks, no modern product labels. No vivid neon colors,
no bright red, no electric blue. No glossy digital finish, no HDR,
no studio lighting, no ring light. Medium contrast, soft film
tonality.
```

`{LIGHTING}` по умолчанию = `"warm golden-hour first light at dawn"`. Замены — см. таблицу в `_findings_step4.md`.

---

## 6.1 Hero (P0) — 6 вариантов

Ренат выбирает один лучший. Остальные — для сравнения. Все — **16:9 ultra-wide cinematic**, full-bleed, target 2560×1440.

### hero-main-A — Dawn Summit Silhouette

**Target file:** `public/images/home/hero-a.webp`
**Aspect:** 16:9 ultra-wide cinematic
**Priority:** P0
**Chain from:** None (anchor candidate)

**Prompt:**
> Ultra-wide cinematic 16:9 frame. A single mountaineer silhouette standing on a wind-scoured snow ridge in the high Central Asian Tian Shan, facing away from the camera toward the pyramidal Khan Tengri peak rising on the horizon. The mountaineer is small, occupying no more than 12% of the frame height, centered slightly left in a pyramidal composition that mirrors the peak behind. First rays of golden dawn light crest from behind the summit, creating a warm amber rim light on the climber's shoulders and a long cool shadow stretching across the snow toward the viewer. Distant ridges layer into blue-hour haze on the left side. The climber wears muted layered outdoor gear in stone, charcoal, and dark olive tones, with a small backpack. No visible face, no logos, no branding. Emphasis on scale — the single human figure against the vast mountain. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Figure ≤15% of frame height, silhouetted, facing away
- Khan Tengri recognizable as a pyramidal snow peak (not Matterhorn)
- Warm amber light from behind the peak, cool shadow in foreground
- No visible face, no logos

**Rejection:**
- Figure large / posing / facing camera
- Peak looks like a European Alps / Matterhorn shape
- Palette tips into saturated orange or neon
- HDR / glossy finish

---

### hero-main-B — Tent at Golden Hour, No Human

**Target file:** `public/images/home/hero-b.webp`
**Aspect:** 16:9 ultra-wide cinematic
**Priority:** P0
**Chain from:** None

**Prompt:**
> Ultra-wide cinematic 16:9 frame. A single small alpine tent pitched on a meadow of yellow autumn grass in the Kazakhstani Tian Shan foothills, no human visible. The tent is a muted ochre-colored dome with guy lines, sitting in the lower third of the frame slightly off-center to the right. Beyond the meadow, a ridge of rust-ochre foothills leads the eye back to the distant pyramidal snow peak of Khan Tengri on the horizon, slightly defocused in warm haze. The first rays of dawn paint the upper snow of the peak in warm amber while the foreground meadow is still in cool shadow. Gentle wisps of mist drift between the tent and the far ridges. Larch and spruce scattered on the mid-ground slope. No people, no gear logos, no brand marks. Sense of quiet presence. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Single tent, lower third, ochre/earth tones
- Yellow alpine grass foreground
- Khan Tengri recognizable in the background, defocused
- No people, no text, no logos

**Rejection:**
- Multiple tents / camp scene with gear everywhere
- Bright tent colors (red, yellow, neon)
- Landscape reads as European Alps or Himalayas

---

### hero-main-C — Hiker Descending Moraine

**Target file:** `public/images/home/hero-c.webp`
**Aspect:** 16:9 ultra-wide cinematic
**Priority:** P0
**Chain from:** None

**Prompt:**
> Ultra-wide cinematic 16:9 frame. A lone hiker seen from three-quarters behind, descending a moraine slope of broken grey granite and stone in the Central Asian Tian Shan. The hiker occupies the right-center of the frame, figure in the middle distance at about 15% of frame height, wearing muted dark-olive shell, stone-grey trousers, and a charcoal backpack with no visible logos. Their posture is natural, mid-step, trekking poles extending down. Beyond the moraine, a warm-lit alpine valley opens up, golden yellow grass catching the first sun, with distant Tian Shan ridges layered in dawn haze. A ribbon of meltwater stream glints in the mid-ground. Rust-ochre foothills frame the valley on the right. Warm side-light sculpts the textures of the stones and the hiker's pack. Sense of scale: vast valley, small human. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Hiker in the middle distance, seen from behind, ~15% frame height
- Moraine texture readable in foreground, warm valley in background
- Distant Tian Shan ridges in dawn haze
- Muted gear palette, no logos

**Rejection:**
- Hiker in action sport pose (running, jumping)
- Gear with visible brand marks
- Landscape reads as Rocky Mountains

---

### hero-main-D — Face in Profile, Dawn Warrior's Horizon

**Target file:** `public/images/home/hero-d.webp`
**Aspect:** 16:9 ultra-wide cinematic
**Priority:** P0
**Chain from:** None
**Note:** Единственный hero-вариант, где лицо видно. Используем только если этот подход выбран финальным.

**Prompt:**
> Ultra-wide cinematic 16:9 frame. Close portrait of a Central Asian / Kazakh person in their early thirties seen in strict profile, filling the left third of the frame. Weathered sun-burnished skin, high cheekbones, dark hair tucked under a muted charcoal wool cap, a few strands loose. The person's eyes are narrowed, looking far out across the horizon toward the warm dawn light that rises on the right side of the frame. Across the remaining two-thirds of the frame, the Central Asian Tian Shan unfolds in soft focus — layered ridges in dawn haze, snow-capped Khan Tengri faint in the distance, warm amber sky above, dusty blue below. The person wears a high-collared stone-olive wool / shell jacket with no logos, collar loosely open. The skin, cap, and background ridges form a warm-to-cool gradient left to right. Intimate yet vast. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Profile only — one side of face, never front-on
- Central Asian / Kazakh features readable
- Background clearly Tian Shan layered ridges in dawn
- Gear without logos

**Rejection:**
- Face turned toward camera, eye contact
- European features
- Portrait retouched to "magazine cover" glossy skin
- Background generic alpine / Swiss

---

### hero-main-E — Ridge Line Minimal, Pure Landscape

**Target file:** `public/images/home/hero-e.webp`
**Aspect:** 16:9 ultra-wide cinematic
**Priority:** P0
**Chain from:** None

**Prompt:**
> Ultra-wide cinematic 16:9 frame. A single jagged mountain ridgeline of the Central Asian Tian Shan silhouetted against a vast dawn sky. No human figures, no gear, no structures. The ridge runs horizontally across the lower third of the frame, its texture sharp — exposed rock spines, patches of windblown snow on the leeward side. Above, nearly abstract: a warm gradient from deep amber at the left horizon through ochre and dusty rose up to cool graphite-blue at the upper right, with faint cirrus clouds catching the first light. The graphic simplicity of the composition reads almost as a film still. Subtle film grain across the sky gradient. Deep atmospheric perspective — the ridge feels close and tactile, the sky feels infinite. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Ridge in lower third, sky in upper two thirds
- Sky is a graduated warm-to-cool gradient, not a blue sky
- No figures, no structures, no gear
- Recognizable Tian Shan texture (jagged rock + snow patches)

**Rejection:**
- Clouds dominate and flatten the sky
- Ridge reads as a single triangular peak (that's Variant A territory)
- Neon sunrise colors / over-saturated gradient

---

### hero-main-F — Return to Camp, Two Distant Figures at Sunset

**Target file:** `public/images/home/hero-f.webp`
**Aspect:** 16:9 ultra-wide cinematic
**Priority:** P0
**Chain from:** None

**Prompt:**
> Ultra-wide cinematic 16:9 frame. Two distant hikers walking back toward a small camp in an alpine basin of the Central Asian Tian Shan, seen from behind, each no more than 8% of frame height. The figures are aligned along the lower-center third of the frame, walking across yellow alpine grass with long warm shadows stretching behind them. The small camp — a single tent and a tiny figure-less fire ring — sits in the mid-ground. Beyond, the pyramidal Khan Tengri peak catches the last warm sunset light, amber and rose on the snow, while the valley around is already sliding into cool violet shadow. Larch and spruce scattered on the left slope. A dry stream bed winds through the foreground. Scale reads huge: two tiny figures, vast basin, monumental peak. [STYLE-BLOCK with LIGHTING = warm late-afternoon sunset light casting long shadows, peak catching last alpenglow]

**Acceptance:**
- Two figures, tiny (≤10% frame), walking toward camp
- Long shadows from warm low sun
- Peak catching alpenglow while valley in cool shadow
- Camp is small (1 tent), minimal

**Rejection:**
- Figures close / recognizable faces
- Group of 3+ hikers (reads as tour group)
- Bright orange tent / colourful gear
- Landscape reads as Scandinavian

---

## 6.2 Категории (P1) — 4 картинки

Все — **1:1 square**, target 800×800. **Chain from: финальный hero.** В промптах `edit_image` другого окна — добавлять префикс "Same visual language, palette, and film stock as the reference image, but now showing:" и передавать hero как `referenceImages`.

Здесь в каждом промпте — описание сцены, которое окно-генератор оборачивает в style-transfer-префикс.

### cat-jackets — Jackets

**Target file:** `public/images/home/categories/jackets.webp`
**Aspect:** 1:1 square
**Priority:** P1
**Chain from:** `hero-main-<selected>`

**Prompt (scene):**
> Square composition 1:1. Medium-close environmental shot: the shoulders and upper back of a single figure seen from behind, wearing a muted dark-olive hardshell jacket with a stone-grey hood pulled up, standing at the edge of a ridge in the Central Asian Tian Shan. The figure is slightly off-center, occupying the right two-thirds of the frame; beyond the shoulders, a blurred valley opens up with warm dawn light on distant ridges. The jacket material shows visible texture — matte ripstop weave, a bead of moisture on the shoulder fabric. No visible logos, no brand patches, no modern product labels. Natural, not a catalog shot — the jacket is worn, purposeful. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Shoulders / upper back only, no face
- Jacket in muted earthy tone, no logos
- Valley / ridges visible behind, in dawn light
- Square composition, well-balanced

**Rejection:**
- Full figure / catalog product pose
- Bright jacket colors
- Any text or logo on the gear

---

### cat-backpacks — Backpacks

**Target file:** `public/images/home/categories/backpacks.webp`
**Aspect:** 1:1 square
**Priority:** P1
**Chain from:** `hero-main-<selected>`

**Prompt (scene):**
> Square composition 1:1. Medium close-up of a large outdoor backpack in a muted stone-grey and dark-olive colorway with charcoal straps, resting against a boulder of grey granite on a moraine slope in the Central Asian Tian Shan. A pair of trekking poles leans against the boulder. The pack is seen from three-quarter side, straps and buckles in visible use — minor scuffs on the fabric, a single climbing sling hanging from the daisy chain. In the background, soft-focused rust-ochre foothills and a sliver of distant snow peak catching the first dawn light. No visible logos, no brand patches, no text on the pack. Tactile, lived-in, not a catalog shot. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Pack occupies 60–70% of frame, three-quarter angle
- Muted earthy colorway, no logos
- Context visible: boulder, moraine, distant peak in dawn
- Square composition

**Rejection:**
- Pack isolated on white / studio background
- Hiker wearing the pack (that's "jackets" territory)
- Bright neon straps / accents

---

### cat-accessories — Accessories

**Target file:** `public/images/home/categories/accessories.webp`
**Aspect:** 1:1 square
**Priority:** P1
**Chain from:** `hero-main-<selected>`

**Prompt (scene):**
> Square composition 1:1. Close overhead still life arranged on a flat granite slab at a dawn bivouac in the Central Asian Tian Shan: a pair of muted charcoal fleece gloves, a knitted wool cap in dark olive, a buff scarf in stone-grey, and a titanium-grey enamel mug holding steaming tea. The items are arranged naturally, not geometric — as if just placed there. Morning golden light rakes across the slab from the right, warming the wool fibers and casting long soft shadows. Tiny droplets of condensation on the mug. A corner of yellow alpine grass intrudes from the lower-left. Visible textures: wool weave, granite grain, enamel chip. No visible logos, no brand patches, no text. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Overhead angle, items arranged naturally
- Earthy muted colors across all items
- Visible texture (wool, granite, enamel)
- Steam + condensation = sense of early morning
- No logos

**Rejection:**
- Items geometrically lined up like a product catalog
- White tabletop / studio background
- Shiny new-product look

---

### cat-tshirts — T-shirts (base layers)

**Target file:** `public/images/home/categories/t-shirts.webp`
**Aspect:** 1:1 square
**Priority:** P1
**Chain from:** `hero-main-<selected>`

**Prompt (scene):**
> Square composition 1:1. Medium shot from behind of a single figure standing outside a small tent at dawn in the Central Asian Tian Shan, wearing only a muted stone-grey base-layer t-shirt, stretching arms up and back. Framing shows from mid-back up; no face visible. The fabric of the shirt reads soft, slightly creased from sleep, warm dawn light raking across the shoulder blades. Behind the figure: a sliver of tent canvas in ochre, yellow alpine grass, and a distant warm-lit ridge. Steam rising from a nearby enamel mug on the grass. Intimate, quiet moment of waking up in the mountains. No visible logos, no brand patches, no text. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Figure from behind, mid-back up, no face
- T-shirt in muted neutral, no logos
- Dawn / morning-after-sleep mood
- Square composition

**Rejection:**
- Action / athletic pose
- Branded gym / fitness t-shirt aesthetic
- Face visible / posing

---

## 6.3 Story (P1) — 1 картинка

### story-main — "Рождены в горах"

**Target file:** `public/images/home/story.webp`
**Aspect:** 3:4 portrait, target 1200×1600
**Priority:** P1
**Chain from:** `hero-main-<selected>`

**Prompt (scene):**
> Tall portrait 3:4 orientation. A lone figure standing on a rocky outcrop at dawn in the Kazakhstani Tian Shan foothills, seen from behind in the lower half of the frame, occupying about 20% of frame height. The figure wears a dark-olive shell jacket, hood down, looking out toward the pyramidal Khan Tengri peak catching first light on its summit in the upper half of the frame. Warm amber rim light on the edge of the figure's shoulders, cool graphite shadow on the rock underfoot. The sky fills the top third — warm amber at the horizon fading to cool dusty blue above. A few larches on the right slope, yellow alpine grass on the outcrop ledge. Vertical composition emphasizes the height between the small human and the towering peak. Intimate and monumental at once. No logos, no text, no brand marks. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Vertical 3:4, figure in lower half, peak in upper half
- Figure from behind, small
- Khan Tengri pyramidal, catching first light
- No logos

**Rejection:**
- Horizontal composition (wrong aspect)
- Figure takes more than a third of frame height
- Peak looks like European Alps

---

## 6.4 Обложки блога (P1) — 6 картинок

Все — **16:9**, target 2560×1440 (full-bleed на странице поста). Кропятся на `/blog` и `/` в 4:3 — композицию делать **safe** в центральных 4:3 (важные элементы не по самым краям).

### blog-cover-khan-tengri-ascent — "Повелитель духов" at Sunset

**Target file:** `public/images/blog/khan-tengri-ascent/cover.webp`
**Aspect:** 16:9
**Priority:** P1
**Chain from:** `hero-main-<selected>` + optionally previous blog cover
**Lighting override:** sunset (drama, "кроваво-красный")

**Prompt (scene):**
> Ultra-wide cinematic 16:9 frame. The pyramidal marble summit of Khan Tengri in the Central Asian Tian Shan, photographed at last light — the peak's upper half glowing deep crimson-amber alpenglow against a darkening graphite-blue sky, earning its local name "Lord of Spirits." No figures, no gear, pure mountain. The peak fills the upper two-thirds of the frame, its sharp ridges clearly defined. Below, lower ridges and a glacier basin are already sliding into cool violet shadow, with faint wisps of wind-blown snow off a leeward ridge. Subtle film grain throughout. Dramatic but restrained — not HDR, not over-saturated. The crimson glow is warm-earthy, not fluorescent. [STYLE-BLOCK with LIGHTING = warm dramatic sunset backlight, deep crimson and amber sky]

**Acceptance:**
- Khan Tengri clearly pyramidal, crimson-amber alpenglow on upper half
- Lower valley in cool shadow (split lighting)
- No figures
- Crimson readable but not neon

**Rejection:**
- HDR over-saturated red
- Figures / gear in frame
- Peak looks generic alpine

---

### blog-cover-choose-jacket-tian-shan — Pass in Storm

**Target file:** `public/images/blog/choose-jacket-tian-shan/cover.webp`
**Aspect:** 16:9
**Priority:** P1
**Chain from:** `hero-main-<selected>` + optionally previous blog cover
**Lighting override:** overcast + blowing snow

**Prompt (scene):**
> Ultra-wide cinematic 16:9 frame. A single figure crossing a high mountain pass in the Central Asian Tian Shan in a sideways driving snow flurry and mist. The figure is small, center-left in the lower third, seen from behind, leaning slightly into the wind, hood of a dark-olive shell jacket pulled up, no face visible. Around the figure, the air is full of streaking wind-blown snow. Wet dark granite rocks rise on either side, partially obscured by grey-blue mist. A faint outline of a ridge behind. The palette is cool — slate-grey, graphite, dusty blue, with the figure's olive jacket as the only warmer note. Moisture visible on the rocks. Sense of exposure and serious weather, not adventure-sport drama. [STYLE-BLOCK with LIGHTING = soft overcast mountain light with blowing snow and mist, cool slate tones]

**Acceptance:**
- Figure small, leaning into wind, from behind
- Blowing snow / mist dominates atmosphere
- Cool slate palette, olive jacket as only warm accent
- Rocks wet and textured

**Rejection:**
- Figure in action-sport ski pose
- Bright-colored jacket
- Clear sunny background (wrong weather)

---

### blog-cover-treks-kazakhstan — Long Trail Through Meadow

**Target file:** `public/images/blog/treks-kazakhstan/cover.webp`
**Aspect:** 16:9
**Priority:** P1
**Chain from:** `hero-main-<selected>` + optionally previous blog cover
**Lighting:** default (dawn)

**Prompt (scene):**
> Ultra-wide cinematic 16:9 frame. A long footpath winds through a vast alpine meadow of yellow autumn grass in the Kazakhstani Tian Shan, leading from the lower-right foreground deep into the center of the frame. A single hiker with a backpack walks away from the camera along the path, small in the middle distance, maybe 10% of frame height. The meadow rolls gently upward; layered ridges of rust-ochre foothills rise in stages behind the hiker, and beyond them, a faint snow-capped peak catches the first dawn light. Scattered larches on the right slope, a thin dry stream bed crossing the path. Sense of solitude, tranquility, wanderlust — "quiet that you won't find in the Alps or Himalayas." Warm low side-light from the right, long shadows from the grass. [STYLE-BLOCK with LIGHTING = warm golden-hour first light at dawn]

**Acceptance:**
- Path leads eye into frame, hiker small in middle distance
- Yellow meadow foreground, layered ridges background
- Distant snow peak in dawn light
- No other people, no signs of infrastructure

**Rejection:**
- Wide group / tour
- Paved road / man-made infrastructure
- Peak looks like Matterhorn

---

### blog-cover-tanar-brand-story — Khan Tengri as Brand Symbol at First Light

**Target file:** `public/images/blog/tanar-brand-story/cover.webp`
**Aspect:** 16:9
**Priority:** P1
**Chain from:** `hero-main-<selected>` + optionally previous blog cover
**Lighting override:** blue hour transitioning to warm

**Prompt (scene):**
> Ultra-wide cinematic 16:9 frame. A pure brand-icon composition: the pyramidal marble silhouette of Khan Tengri in the Central Asian Tian Shan, centered in the frame, in the quiet minute before first light. The sky is a deep cool graphite-blue fading to a narrow band of warm amber at the eastern horizon where the sun is about to rise. The summit is still dark but a single first shaft of warm amber light catches only the very top edge of the peak, barely marking the gold-on-stone moment that gives the brand its name (Tanar — "greeting the dawn"). No figures, no foreground distractions — only layered ridges receding into cool blue haze at the base of the peak, with a hint of glacier at the foot. Subtle film grain. Almost iconic, almost a poster — quiet and symbolic. [STYLE-BLOCK with LIGHTING = blue hour just before first light, cool dawn gradient transitioning to warm]

**Acceptance:**
- Khan Tengri centered, pyramidal silhouette
- Blue hour sky with narrow warm band at horizon
- Single amber highlight only on the peak summit
- No figures, minimal foreground

**Rejection:**
- Full sunrise (too warm — that's "khan-tengri-ascent" territory)
- Figures in frame
- Multiple peaks competing for attention

---

### blog-cover-kolsai-backpack-test — Kolsai Lake in Mist

**Target file:** `public/images/blog/kolsai-backpack-test/cover.webp`
**Aspect:** 16:9
**Priority:** P1
**Chain from:** `hero-main-<selected>` + optionally previous blog cover
**Lighting override:** mist + golden filtered

**Prompt (scene):**
> Ultra-wide cinematic 16:9 frame. A still dark-emerald alpine lake in the Kungey Alatau (northern Tian Shan), surrounded by a dense larch and spruce forest on steep slopes — recognizably the Kolsai Lakes region of Kazakhstan. A low layer of warm misty fog drifts across the water. In the near mid-ground on the right shore, a single figure with a backpack stands at the water's edge, seen from behind at maybe 8% of frame height. Morning golden light filters through the mist from the left, creating god-rays through the conifers. The lake surface reflects the forest in gently broken ripples. A few reeds in the foreground. No urban signs, no tourist infrastructure. Meditative, lyrical. [STYLE-BLOCK with LIGHTING = misty early morning over still water, warm golden-hour light filtering through fog]

**Acceptance:**
- Dark emerald still water, conifer forest around
- Mist + god-rays from filtered golden light
- Single figure small, on right shore, from behind
- Reflections readable but softened by mist

**Rejection:**
- No mist / clear bright day
- Multiple people / visible tourists
- Tropical / Mediterranean lake look

---

### blog-cover-eco-philosophy — Nature Texture Macro

**Target file:** `public/images/blog/eco-philosophy/cover.webp`
**Aspect:** 16:9
**Priority:** P1
**Chain from:** `hero-main-<selected>` + optionally previous blog cover
**Lighting override:** soft diffused morning, warm tint

**Prompt (scene):**
> Ultra-wide cinematic 16:9 frame. A tight, intimate nature-texture shot on the forest floor at dawn in the Central Asian Tian Shan foothills — a patch of moss-covered granite with a few spruce needles resting on it, a single water droplet clinging to one needle catching soft morning light. Selective focus: the droplet sharp, the moss in slight defocus, the background a soft blur of forest floor in warm earth tones. A corner of yellow alpine grass peeks in from the right edge. Shallow depth of field, macro/close-perspective. Palette entirely muted earth — moss green, stone grey, wet granite, a hint of rust. No human presence, no gear, no infrastructure. Feels like a quiet noticing, a respect for the small. [STYLE-BLOCK with LIGHTING = soft diffused early morning light, gentle warm tint]

**Acceptance:**
- Tight macro / close-perspective, not a landscape
- Shallow depth of field, single point of focus (droplet)
- Palette fully muted earth
- No human / gear

**Rejection:**
- Wide landscape (doesn't match the intimate theme)
- Harsh sun / deep shadows
- Bright flower / tropical color accent

---

## 6.5 Inline в постах (P2)

**Не требуется.** `grep -n "<img" content/blog/ → No matches found` (Step 2 verification). Fallback в [src/components/mdx-components.tsx:14](../../../src/components/mdx-components.tsx#L14) существует для будущего контента. Если Ренат добавит `<img>` в MDX позже — можно написать inline-промпты по аналогии с блог-обложками (4:3 landscape, тот же style-block).

---

## Итого

| # | ID | aspect | target file | lighting override |
|---|---|---|---|---|
| 1 | hero-main-A | 16:9 | public/images/home/hero-a.webp | default (dawn) |
| 2 | hero-main-B | 16:9 | public/images/home/hero-b.webp | default (dawn) |
| 3 | hero-main-C | 16:9 | public/images/home/hero-c.webp | default (dawn) |
| 4 | hero-main-D | 16:9 | public/images/home/hero-d.webp | default (dawn) |
| 5 | hero-main-E | 16:9 | public/images/home/hero-e.webp | default (dawn) |
| 6 | hero-main-F | 16:9 | public/images/home/hero-f.webp | sunset |
| 7 | cat-jackets | 1:1 | public/images/home/categories/jackets.webp | default |
| 8 | cat-backpacks | 1:1 | public/images/home/categories/backpacks.webp | default |
| 9 | cat-accessories | 1:1 | public/images/home/categories/accessories.webp | default |
| 10 | cat-tshirts | 1:1 | public/images/home/categories/t-shirts.webp | default |
| 11 | story-main | 3:4 | public/images/home/story.webp | default |
| 12 | blog-cover-khan-tengri-ascent | 16:9 | public/images/blog/khan-tengri-ascent/cover.webp | sunset |
| 13 | blog-cover-choose-jacket-tian-shan | 16:9 | public/images/blog/choose-jacket-tian-shan/cover.webp | overcast+snow |
| 14 | blog-cover-treks-kazakhstan | 16:9 | public/images/blog/treks-kazakhstan/cover.webp | default |
| 15 | blog-cover-tanar-brand-story | 16:9 | public/images/blog/tanar-brand-story/cover.webp | blue hour |
| 16 | blog-cover-kolsai-backpack-test | 16:9 | public/images/blog/kolsai-backpack-test/cover.webp | mist |
| 17 | blog-cover-eco-philosophy | 16:9 | public/images/blog/eco-philosophy/cover.webp | soft diffused |

**17 промптов** (из них 6 — варианты одного hero, Ренат выбирает один). Итоговые файлы для сайта: **1 + 4 + 1 + 6 = 12 картинок**.

## Проверка

- [x] Hero: 6 принципиально разных вариантов, все полные
- [x] 4 категории, полные промпты
- [x] 1 story, полный промпт
- [x] 6 блог-обложек, привязаны к реальным темам постов из Step 2
- [x] Inline — явно помечено "не требуется"
- [x] У каждого промпта: target file, aspect, priority, chain from, prompt, acceptance, rejection
- [x] Style-block вставляется в каждый (маркер `[STYLE-BLOCK]` с override lighting)
- [x] Все промпты на английском
- [x] Разнообразие lighting между блог-обложками: dawn / sunset / blue hour / overcast / mist / soft diffused — 6 разных настроений
