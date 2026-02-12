export interface StagingStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
  emoji: string;
}

export function getStyleById(id: string): StagingStyle | undefined {
  return STAGING_STYLES.find((s) => s.id === id);
}

export const STAGING_STYLES: StagingStyle[] = [
  {
    id: "modern-minimalist",
    name: "Modern Minimalist",
    description: "Clean lines, neutral tones, minimal furniture",
    prompt:
      "Modern Minimalist style — Use clean lines, neutral tones (whites, grays, warm beiges), minimal but impactful furniture. Think simple geometric shapes, uncluttered spaces, and a few well-chosen statement pieces. Warm wood accents for texture.",
    emoji: "✨",
  },
  {
    id: "mid-century-modern",
    name: "Mid-Century Modern",
    description: "Retro-inspired, warm woods, iconic furniture pieces",
    prompt:
      "Mid-Century Modern style — Use retro-inspired furniture with warm wood tones (walnut, teak), organic curves, tapered legs. Include iconic pieces like Eames-style chairs, low-profile sofas, starburst mirrors, and bold geometric patterns. Warm earthy color palette with pops of mustard, teal, or orange.",
    emoji: "🪑",
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    description: "Light woods, white/cream palette, cozy hygge feel",
    prompt:
      "Scandinavian style — Use light woods (birch, pine, ash), white and cream palette with soft pastels. Emphasize coziness (hygge) with wool throws, sheepskin rugs, and candles. Simple functional furniture, plenty of greenery, and natural light feel.",
    emoji: "🌿",
  },
  {
    id: "traditional-classic",
    name: "Traditional / Classic",
    description: "Rich fabrics, dark woods, elegant and timeless",
    prompt:
      "Traditional Classic style — Use rich fabrics (velvet, silk, damask), dark wood furniture (mahogany, cherry), elegant and timeless pieces. Include ornate details, table lamps, framed artwork, and layered textiles. Color palette of deep blues, burgundy, gold, and cream.",
    emoji: "🏛️",
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "High-end finishes, statement pieces, premium materials",
    prompt:
      "Luxury style — Use high-end, premium-looking furniture and finishes. Include statement pieces like a large chandelier effect, marble accents, metallic gold or brass fixtures, plush oversized seating, silk curtains, and designer-looking accessories. Think penthouse or high-end real estate listing.",
    emoji: "💎",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Light blues, whites, natural textures, beachy relaxed vibe",
    prompt:
      "Coastal style — Use a light, airy color palette of whites, soft blues, sandy beiges, and seafoam greens. Include natural textures like rattan, jute, driftwood, and linen. Relaxed, beachy furniture with slipcovered sofas, woven baskets, and nautical-inspired accessories.",
    emoji: "🌊",
  },
  {
    id: "industrial-loft",
    name: "Industrial Loft",
    description: "Exposed elements, metal + wood, urban aesthetic",
    prompt:
      "Industrial Loft style — Use a mix of raw metal and reclaimed wood furniture. Include leather seating, Edison-style lighting, metal shelving, and urban-inspired accessories. Color palette of charcoal, rust, brown, and black with warm accent lighting.",
    emoji: "🏗️",
  },
  {
    id: "farmhouse",
    name: "Farmhouse",
    description: "Rustic warmth, shiplap vibes, comfortable and inviting",
    prompt:
      "Farmhouse style — Use rustic, warm furniture with distressed wood finishes, comfortable oversized seating, and cozy textiles. Include farmhouse table, barn-door inspired elements, mason jar accessories, woven baskets, and a warm neutral palette with soft whites and natural wood tones.",
    emoji: "🏡",
  },
];
