// Deterministic, resumable, effectively-infinite prompt stream.
//
// Given a single monotonically increasing global index, we produce a unique
// prompt spec. Categories are visited round-robin so the vault grows evenly
// "by type". Within a category we mixed-radix decode the subject x dimension
// product; once that product is exhausted we advance the `variant` dimension,
// so the stream never runs dry.
import { CATEGORIES, DIMENSIONS, DESIGN_DIMENSIONS, ORIENTATION_SIZE } from './taxonomy.js';
import { slug } from '../storage/paths.js';

// Coprime multiplier (a known MINSTD LCG prime) used to scatter the combination
// index so consecutive images differ across all style/lighting/palette/mood
// dimensions. Prime and not a factor of any category product (2^7·3^2·5^3·N) →
// the (index → combo) map stays a bijection (unique + complete coverage).
const COMBO_STRIDE = 48271;
// Per-category offset stride: makes the 60 categories visited in one round-robin
// window (all sharing the same localIndex) land on widely different combos, so a
// "newest images" snapshot shows many styles/lightings at once. Coprime prime.
const CAT_STRIDE = 28657;

function decodeMixedRadix(value, radixes) {
  // radixes ordered least-significant first.
  const out = [];
  let v = value;
  for (const r of radixes) {
    out.push(v % r);
    v = Math.floor(v / r);
  }
  return out;
}

export function createPromptStream({ categories = null, theme = null, orientation = 'square' } = {}) {
  let scope;
  if (theme) {
    // Word/theme mode: one synthetic category whose subjects are the given
    // word(s), crossed with every style/lighting/... for endless variety.
    const subjects = String(theme).split(',').map((s) => s.trim()).filter(Boolean);
    if (subjects.length === 0) throw new Error('Empty --theme.');
    const name = `theme-${slug(subjects[0], 40) || 'custom'}`;
    scope = [{ name, orientation, subjects }];
  } else {
    scope = categories ? CATEGORIES.filter((c) => categories.includes(c.name)) : CATEGORIES;
  }
  if (scope.length === 0) {
    throw new Error('No categories in scope. Check the --categories filter or --theme.');
  }

  const dims = DIMENSIONS;
  // Text-bearing design categories cross the subject with design dimensions instead
  // of the artistic ones (style/lighting/palette make no sense for UI mockups).
  const DESIGN = [DESIGN_DIMENSIONS.aesthetic, DESIGN_DIMENSIONS.theme, DESIGN_DIMENSIONS.accent];
  // Per-category combination product (subjects x its dimension set).
  const productOf = (cat) =>
    cat.allowText
      ? cat.subjects.length * DESIGN.reduce((p, d) => p * d.length, 1)
      : cat.subjects.length *
        dims.style.length *
        dims.lighting.length *
        dims.palette.length *
        dims.composition.length *
        dims.mood.length;

  /**
   * Resolve the prompt spec for a global index.
   * @param {number} globalIndex 0-based
   */
  function at(globalIndex) {
    const n = scope.length;
    const catIdx = globalIndex % n;
    const cat = scope[catIdx];
    const localIndex = Math.floor(globalIndex / n);

    const product = productOf(cat);
    const variantLevel = Math.floor(localIndex / product);
    // Scatter the combination index so CONSECUTIVE images vary across EVERY
    // dimension (style/lighting/palette/mood). The localIndex term spreads a
    // single category over time; the catIdx term spreads the 60 categories of
    // one round-robin window across the space (so a "newest" snapshot is varied).
    // Affine map with a coprime multiplier → bijective per category (unique +
    // complete). Without it a whole cursor window shares one look.
    const combo = ((localIndex % product) * COMBO_STRIDE + catIdx * CAT_STRIDE) % product;
    const variantWrap = dims.variant[variantLevel % dims.variant.length];

    // Text-bearing design categories: cross subject x (aesthetic, theme, accent).
    if (cat.allowText) {
      const radixes = [cat.subjects.length, ...DESIGN.map((d) => d.length)];
      const [dsi, ai, ti, ci] = decodeMixedRadix(combo, radixes);
      const subject = cat.subjects[dsi];
      const aesthetic = DESIGN[0][ai];
      const theme = DESIGN[1][ti];
      const accent = DESIGN[2][ci];
      const basePrompt = [subject, aesthetic, theme, accent]
        .concat(variantWrap ? [variantWrap] : [])
        .join(', ');
      return {
        globalIndex,
        comboKey: `${cat.name}#${combo}#v${variantLevel}`,
        category: cat.name,
        orientation: cat.orientation,
        defaultSize: ORIENTATION_SIZE[cat.orientation] || '2048x2048',
        allowText: true,
        subject,
        style: aesthetic,
        lighting: null,
        palette: accent,
        composition: null,
        mood: theme,
        variant: variantWrap,
        basePrompt
      };
    }

    const radixes = [
      cat.subjects.length,
      dims.style.length,
      dims.lighting.length,
      dims.palette.length,
      dims.composition.length,
      dims.mood.length
    ];
    const [si, sty, li, pa, co, mo] = decodeMixedRadix(combo, radixes);

    const subject = cat.subjects[si];
    const style = dims.style[sty];
    const lighting = dims.lighting[li];
    const palette = dims.palette[pa];
    const composition = dims.composition[co];
    const mood = dims.mood[mo];
    const variant = dims.variant[variantLevel % dims.variant.length];

    const basePrompt = [subject, style, lighting, palette, composition, mood]
      .concat(variant ? [variant] : [])
      .join(', ');

    return {
      globalIndex,
      comboKey: `${cat.name}#${combo}#v${variantLevel}`,
      category: cat.name,
      orientation: cat.orientation,
      defaultSize: ORIENTATION_SIZE[cat.orientation] || '2048x2048',
      subject,
      style,
      lighting,
      palette,
      composition,
      mood,
      variant,
      basePrompt
    };
  }

  return {
    at,
    scopeNames: scope.map((c) => c.name),
    // size of one full pass before variant wrapping kicks in (for reporting)
    baseSpaceSize: scope.reduce((sum, c) => sum + productOf(c), 0)
  };
}
