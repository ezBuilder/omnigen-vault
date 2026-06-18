// The "every (text-free) case in the world" prompt taxonomy.
//
// A prompt = one subject (from a category) crossed with one option from each
// shared dimension (style x lighting x palette x composition x mood) plus an
// optional "variant" modifier used to keep the space effectively infinite.
//
// Category names double as the top-level folder names on disk (kebab-case).
// The vault is purely visual, text-free imagery. Text-BEARING design (UI mockups,
// logos, typographic posters) is excluded; format-sized but text-free backgrounds
// (web/mobile/poster/tablet wallpapers) are included as abstract/scenic art.
import { STYLES } from './styles.js';

export const DIMENSIONS = {
  // 270+ researched, text-free visual styles (photography, classical & modern
  // painting, world/folk/indigenous, illustration/digital/3D, print & craft,
  // contemporary/genre). See styles.js.
  style: STYLES,
  lighting: [
    'golden hour warm light',
    'soft overcast diffused light',
    'dramatic chiaroscuro lighting',
    'bright high-key lighting',
    'moody low-key lighting',
    'neon glow, vibrant rim light',
    'backlit silhouette glow',
    'cool blue hour twilight',
    'volumetric god rays',
    'bioluminescent ambient glow'
  ],
  palette: [
    'vibrant saturated colors',
    'muted pastel palette',
    'monochrome grayscale',
    'warm earthy tones',
    'cool teal and blue palette',
    'high-contrast complementary colors',
    'soft desaturated tones',
    'jewel tones, rich and deep',
    'analogous sunset palette',
    'duotone color scheme'
  ],
  composition: [
    // NOTE: 'seamless repeating pattern' was removed — applied across all
    // categories it produced ugly tiled/grid images. Pattern categories still
    // get patterns via their subjects, not this composition.
    'centered symmetrical composition',
    'rule-of-thirds composition',
    'top-down flat lay',
    'extreme close-up detail',
    'wide establishing shot',
    'dynamic diagonal composition',
    'minimal single subject on plain background',
    'layered depth with foreground and background',
    'birds-eye aerial view'
  ],
  mood: [
    'serene and calm',
    'energetic and lively',
    'mysterious and dramatic',
    'dreamy and ethereal',
    'cozy and warm',
    'clean and futuristic',
    'nostalgic and vintage',
    'bold and graphic'
  ],
  // Wrap-variation modifiers: when a category's primary space is exhausted the
  // stream advances this dimension so prompts keep changing — i.e. never run out.
  variant: [
    '',
    'with subtle bokeh',
    'with fine surface texture',
    'with delicate reflections',
    'from an unusual angle',
    'with atmospheric haze',
    'with intricate ornamental detail',
    'with a sense of scale and grandeur',
    'with crisp geometric precision',
    'with organic flowing forms'
  ]
};

export const CATEGORIES = [
  // ───────── nature & environment ─────────
  { name: 'nature-landscapes', orientation: 'landscape', subjects: [
    'a misty mountain range at dawn', 'rolling green hills under a wide sky', 'a winding river through a canyon',
    'a tranquil alpine lake reflecting peaks', 'rolling sand dunes in a vast desert', 'dense fog rolling over a valley',
    'terraced rice fields on a hillside', 'a frozen tundra under aurora', 'sea cliffs meeting crashing waves',
    'a volcanic landscape with lava fields', 'a lavender field to the horizon', 'a meadow of wildflowers',
    'an endless salt flat mirror', 'autumn forest in full color', 'a glacier carving through rock', 'a canyon at sunset' ] },
  { name: 'mountains-peaks', orientation: 'landscape', subjects: [
    'a snow-capped summit above clouds', 'a jagged granite ridge', 'a lone peak at sunrise', 'a mountain reflected in a lake',
    'a rocky alpine pass', 'mist swirling around cliffs', 'a volcano with a smoking crater', 'terraced foothills',
    'a steep gorge with a river', 'a plateau under stormy skies', 'a glacier between two peaks', 'a hiker-free summit panorama' ] },
  { name: 'forests-woodlands', orientation: 'landscape', subjects: [
    'sunbeams through a pine forest', 'a moss-covered ancient woodland', 'a bamboo grove', 'a misty redwood forest',
    'an autumn birch forest', 'a tropical jungle canopy', 'a forest path in fog', 'fallen leaves on a forest floor',
    'a snowy evergreen forest', 'a forest stream over rocks', 'gnarled oak trees', 'fireflies in a dark wood' ] },
  { name: 'deserts-dunes', orientation: 'landscape', subjects: [
    'rippling sand dunes at sunset', 'a desert oasis with palms', 'cracked dry earth under heat haze', 'red rock mesas',
    'a sandstorm on the horizon', 'a starry sky over the dunes', 'wind patterns in fine sand', 'a lone cactus at dusk',
    'an arid canyon of layered rock', 'salt crystals on a dry lakebed', 'desert hills at golden hour', 'dunes under a full moon' ] },
  { name: 'beaches-coastlines', orientation: 'landscape', subjects: [
    'turquoise waves on white sand', 'a rocky coastline at sunset', 'a tropical lagoon from above', 'tide pools among rocks',
    'a long pier into calm water', 'palm trees over a beach', 'sea foam on dark sand', 'cliffs above a stormy sea',
    'a hidden cove with clear water', 'ripples on a shallow shore', 'a coral beach at low tide', 'a lighthouse on a headland' ] },
  { name: 'waterfalls-rivers', orientation: 'landscape', subjects: [
    'a towering jungle waterfall', 'a wide river delta from above', 'a mountain stream over boulders', 'a misty cascade',
    'rapids cutting through a gorge', 'a calm river reflecting trees', 'a frozen waterfall in winter', 'a series of cascading pools',
    'a meandering river at sunrise', 'water plunging into a turquoise pool', 'a creek through autumn woods', 'a dam spillway in motion' ] },
  { name: 'skies-clouds', orientation: 'landscape', subjects: [
    'towering cumulus at noon', 'a fiery sunset sky', 'storm clouds gathering', 'a sky full of stars and the milky way',
    'soft cirrus wisps', 'a double rainbow after rain', 'aurora borealis over a horizon', 'mammatus clouds before a storm',
    'a pastel dawn sky', 'sun rays piercing dark clouds', 'a crescent moon in a deep blue sky', 'lightning across the clouds' ] },
  { name: 'aerial-landscapes', orientation: 'landscape', subjects: [
    'aerial view of winding rivers', 'patchwork farmland from above', 'a coastline seen from the sky', 'a city grid at night from above',
    'mountain ridges from a plane', 'a braided river delta', 'circular irrigation fields', 'a forest canopy from above',
    'snow patterns on tundra', 'an island chain in blue sea', 'terraced fields from overhead', 'desert dunes from the air' ] },
  { name: 'space-cosmos', orientation: 'landscape', subjects: [
    'a swirling spiral galaxy', 'a colorful nebula cloud', 'a ringed gas giant planet', 'a field of distant stars',
    'a glowing crescent moon', 'a solar eclipse corona', 'an asteroid field', 'a rocky alien planet surface',
    'a comet with a glowing tail', 'a dense star cluster', 'the milky way over a horizon', 'a supernova burst' ] },
  { name: 'underwater-marine', orientation: 'landscape', subjects: [
    'a vibrant coral reef', 'a school of silver fish', 'a sea turtle gliding', 'a jellyfish drifting in dark water',
    'an octopus camouflaged on rocks', 'a kelp forest with light beams', 'a clownfish in an anemone', 'a manta ray from below',
    'a seahorse clinging to coral', 'bioluminescent plankton at night', 'a shipwreck overgrown with coral', 'a starfish on the sea floor' ] },
  { name: 'weather-atmosphere', orientation: 'landscape', subjects: [
    'a dramatic lightning storm', 'thick fog over a lake', 'snowflakes falling at night', 'a tornado on the plains',
    'heavy rain on a window', 'a sandstorm approaching', 'morning dew on a spiderweb', 'frost crystals on glass',
    'a misty rainforest morning', 'sun breaking after a storm', 'hail on a green field', 'a calm sky at golden hour' ] },
  { name: 'seasons-nature', orientation: 'landscape', subjects: [
    'cherry blossoms in spring', 'a sunny summer beach', 'autumn leaves on a path', 'a snowy winter forest',
    'a frost-covered meadow', 'a spring garden in bloom', 'a summer wheat field', 'fog over an autumn vineyard',
    'icicles on a branch', 'fresh green buds in spring', 'a pumpkin patch in fall', 'a frozen lake in winter' ] },

  // ───────── flora ─────────
  { name: 'flora-plants', orientation: 'portrait', subjects: [
    'a single dew-covered rose', 'a cluster of wild mushrooms on moss', 'a fern unfurling its frond', 'a succulent rosette close-up',
    'a tropical monstera leaf', 'a dandelion seed head', 'a lotus flower on still water', 'a tangle of climbing ivy',
    'a bonsai tree on a stand', 'a carnivorous pitcher plant', 'a bundle of dried lavender', 'a moss-covered tree bark',
    'an orchid in full bloom', 'a cactus with a single flower', 'air plants on driftwood', 'a vine with morning dew' ] },
  { name: 'flowers-blooms', orientation: 'portrait', subjects: [
    'a sunflower facing the light', 'a field of tulips', 'a peony in full bloom', 'a bouquet of wildflowers',
    'cherry blossoms on a branch', 'a single hibiscus flower', 'a cluster of daisies', 'a blue hydrangea',
    'a rose garden at dawn', 'lotus blossoms on a pond', 'poppies in a breeze', 'a macro of flower petals' ] },
  { name: 'trees-foliage', orientation: 'portrait', subjects: [
    'a lone oak in a field', 'a weeping willow by water', 'a cherry tree in full blossom', 'a baobab at sunset',
    'autumn maple leaves', 'a pine silhouette against the sky', 'gnarled olive tree roots', 'a palm against blue sky',
    'a forest of white birches', 'a single golden ginkgo tree', 'tropical leaves backlit', 'a tree canopy from below' ] },
  { name: 'fruits-vegetables', orientation: 'square', subjects: [
    'a halved pomegranate', 'fresh strawberries with water drops', 'a pile of colorful bell peppers', 'a sliced watermelon',
    'a bunch of grapes on the vine', 'ripe tomatoes on a wooden table', 'a basket of mixed berries', 'a cut citrus arrangement',
    'fresh leafy greens', 'a bowl of figs', 'an avocado halved', 'a still life of autumn squash' ] },

  // ───────── fauna ─────────
  { name: 'animals-wildlife', orientation: 'square', subjects: [
    'a red fox in snow', 'a majestic lion resting', 'a leaping dolphin', 'a curious meerkat standing',
    'a galloping wild horse', 'a chameleon on a branch', 'a humpback whale breaching', 'a deer in a misty forest',
    'a polar bear on ice', 'a frog on a lily pad', 'a herd of elephants at sunset', 'a tiger in tall grass',
    'a wolf howling at dusk', 'a panda eating bamboo', 'a giraffe against the sky', 'a sleeping red panda' ] },
  { name: 'birds', orientation: 'square', subjects: [
    'a hummingbird mid-hover', 'an owl perched at dusk', 'a colorful parrot in flight', 'a flamingo on one leg',
    'an eagle soaring', 'a peacock displaying feathers', 'a robin on a branch', 'a kingfisher diving',
    'a flock of starlings at dusk', 'a toucan close-up', 'a swan on still water', 'a pair of lovebirds' ] },
  { name: 'sea-creatures', orientation: 'square', subjects: [
    'a translucent jellyfish', 'a curious seal underwater', 'a giant octopus', 'a school of tropical fish',
    'a hermit crab on sand', 'a starfish close-up', 'a nautilus shell', 'a pufferfish inflated',
    'a sea dragon among kelp', 'a moray eel peeking out', 'a pod of orcas', 'a glowing deep-sea anglerfish' ] },
  { name: 'insects-microfauna', orientation: 'square', subjects: [
    'a dragonfly with iridescent wings', 'a honeybee on a blossom', 'a ladybug on a leaf', 'a praying mantis close-up',
    'a spider web with dew drops', 'a beetle with metallic shell', 'an ant carrying a leaf', 'a moth with patterned wings',
    'a snail on wet stone', 'a grasshopper on a blade of grass', 'a cluster of fireflies glowing', 'a butterfly on a flower' ] },
  { name: 'reptiles-amphibians', orientation: 'square', subjects: [
    'a green tree frog on a leaf', 'a coiled snake with patterned scales', 'a chameleon changing color', 'a gecko on glass',
    'a tortoise in grass', 'an iguana basking', 'a salamander on moss', 'a crocodile eye close-up',
    'a poison dart frog', 'a bearded dragon', 'a turtle swimming', 'a lizard on warm rock' ] },
  { name: 'pets-domestic', orientation: 'square', subjects: [
    'a sleeping house cat', 'a golden retriever puppy', 'a fluffy rabbit', 'a curious kitten',
    'a dog running on a beach', 'a cat in a sunbeam', 'a guinea pig with hay', 'a parakeet on a perch',
    'a hamster in shavings', 'a dog tilting its head', 'a black cat with green eyes', 'a corgi in a field' ] },
  { name: 'farm-animals', orientation: 'square', subjects: [
    'a cow in a green pasture', 'a flock of sheep on a hill', 'a rooster at sunrise', 'a piglet in mud',
    'a horse in a stable doorway', 'goats on a rocky slope', 'ducks on a farm pond', 'a hen with chicks',
    'a donkey in a meadow', 'a barn with grazing cattle', 'an alpaca close-up', 'a turkey displaying feathers' ] },
  { name: 'mythical-creatures', orientation: 'portrait', subjects: [
    'a majestic dragon in flight', 'a serene unicorn in a glade', 'a phoenix rising in flames', 'a griffin on a cliff',
    'a glowing forest spirit', 'a sea serpent in waves', 'a winged horse over clouds', 'a luminous fox spirit',
    'a stone golem in a cave', 'a fairy among glowing flowers', 'a kraken beneath ships', 'a celestial deer with antlers of light' ] },

  // ───────── food & drink ─────────
  { name: 'food-and-drink', orientation: 'square', subjects: [
    'a stack of fluffy pancakes', 'a bowl of ramen with steam', 'fresh sushi on a slate', 'a rustic loaf of bread',
    'a colorful fruit platter', 'a sizzling steak on cast iron', 'a bowl of fresh salad', 'a charcuterie board',
    'a bowl of noodles being lifted', 'fresh berries in a basket', 'a gourmet burger', 'a pizza fresh from the oven',
    'a breakfast spread on a table', 'a bowl of curry with rice', 'tacos on a wooden board', 'a cheese platter' ] },
  { name: 'desserts-sweets', orientation: 'square', subjects: [
    'a slice of layered cake', 'a scoop of ice cream melting', 'artisan chocolate truffles', 'a stack of macarons',
    'a glazed donut close-up', 'a berry tart', 'a molten chocolate cake', 'a sundae with toppings',
    'cupcakes with swirled frosting', 'a crème brûlée', 'cotton candy clouds', 'a tray of colorful pastries' ] },
  { name: 'beverages-drinks', orientation: 'square', subjects: [
    'a cup of latte with foam art', 'a glass of red wine', 'a cocktail with citrus garnish', 'iced tea with mint',
    'a steaming cup of tea', 'a smoothie with fresh fruit', 'pouring espresso', 'a glass of orange juice with pulp',
    'hot chocolate with marshmallows', 'a refreshing lemonade', 'a tropical drink on the beach', 'bubbles rising in soda' ] },

  // ───────── people ─────────
  { name: 'portraits-people', orientation: 'portrait', subjects: [
    'an elderly fisherman with weathered hands', 'a child laughing in sunlight', 'a dancer mid-pose', 'a portrait in soft window light',
    'a craftsperson at work', 'a face half in shadow', 'a market vendor smiling', 'a musician with closed eyes',
    'a profile against a sunset', 'hands shaping clay on a wheel', 'a person in traditional dress', 'a candid street portrait' ] },
  { name: 'people-silhouettes', orientation: 'portrait', subjects: [
    'a lone figure on a hilltop at sunset', 'a person walking in the rain with an umbrella', 'a child running through a field',
    'a couple walking on a beach at dusk', 'a figure gazing at the stars', 'a runner silhouetted at dawn',
    'a person reading by a window', 'a crowd silhouette at a concert', 'a cyclist against the sky', 'a dancer leaping in shadow',
    'a fisherman casting at dusk', 'two friends on a rooftop' ] },
  { name: 'fashion-style', orientation: 'portrait', subjects: [
    'flowing fabric in motion', 'a folded stack of textiles', 'a vintage leather jacket', 'a pair of leather boots',
    'a wide-brimmed hat on a stand', 'silk scarves draped', 'a knitted wool sweater detail', 'an elegant evening gown on a form',
    'a row of colorful sneakers', 'a tailored suit on a mannequin', 'a denim texture close-up', 'a fashion accessory flat lay' ] },
  { name: 'dance-movement', orientation: 'portrait', subjects: [
    'a ballet dancer mid-leap', 'a contemporary dancer in flowing cloth', 'a breakdancer frozen in motion', 'twirling skirts in motion',
    'a tango couple in shadow', 'a dancer against bright light', 'ribbons trailing in a spin', 'a silhouette of a pirouette',
    'flamenco motion blur', 'a leap captured at peak height', 'hands and fabric in motion', 'a group in synchronized motion' ] },
  { name: 'sports-activities', orientation: 'landscape', subjects: [
    'a surfer riding a wave', 'a cyclist on a mountain trail', 'a rock climber on a cliff', 'a skier carving fresh snow',
    'a kayaker in rapids', 'a swimmer underwater', 'a hiker on a ridge', 'a skateboarder in motion',
    'a yoga pose at sunrise', 'a runner at sunrise', 'a hot air balloon race', 'a paraglider over mountains' ] },

  // ───────── architecture & places ─────────
  { name: 'architecture-buildings', orientation: 'portrait', subjects: [
    'a modern glass skyscraper', 'an ancient stone temple', 'a spiral staircase from above', 'a gothic cathedral facade',
    'a minimalist concrete house', 'a traditional Japanese pagoda', 'an art deco building facade', 'a futuristic curved structure',
    'a grand library interior', 'an arched stone bridge', 'a lighthouse on a cliff', 'a row of colorful townhouses',
    'a domed observatory', 'a brutalist concrete monument' ] },
  { name: 'interiors-spaces', orientation: 'landscape', subjects: [
    'a cozy living room with a fireplace', 'a sunlit minimalist bedroom', 'a rustic farmhouse kitchen', 'a plant-filled reading nook',
    'an industrial loft apartment', 'a Scandinavian dining room', 'a vintage coffee shop interior', 'a grand hotel lobby',
    'a greenhouse full of plants', 'an attic studio with a skylight', 'a luxurious bathroom with a tub', 'a wood-paneled study' ] },
  { name: 'urban-cityscapes', orientation: 'landscape', subjects: [
    'a neon-lit city street at night', 'a sprawling skyline at sunset', 'a quiet cobblestone alley', 'a busy crosswalk from above',
    'rain-slicked streets reflecting lights', 'a rooftop view over a metropolis', 'a foggy harbor with boats', 'a vintage tram on a hill',
    'a bridge spanning a river at dusk', 'a market street with stalls', 'a quiet suburban street in autumn', 'a subway platform' ] },
  { name: 'landmarks-monuments', orientation: 'landscape', subjects: [
    'an ancient ruined amphitheater', 'a stone circle at dawn', 'a grand triumphal arch', 'a hilltop castle',
    'a desert temple carved in rock', 'a tall obelisk against the sky', 'a sweeping suspension bridge', 'a terraced ancient city',
    'a giant statue overlooking a bay', 'a palace with reflecting pools', 'a fortress wall along a ridge', 'a pagoda by a lake' ] },
  { name: 'villages-rural', orientation: 'landscape', subjects: [
    'a Mediterranean coastal village', 'a rustic wooden cabin in the woods', 'a thatched cottage with a garden', 'an alpine village in snow',
    'a fishing village at dawn', 'a farmhouse among fields', 'a hillside town with terracotta roofs', 'a windmill in a green field',
    'a stone village by a river', 'a barn at golden hour', 'a vineyard cottage', 'a quiet country lane' ] },

  // ───────── objects & things ─────────
  { name: 'everyday-objects', orientation: 'square', subjects: [
    'a stack of old books', 'a vintage pocket watch', 'a bowl of colorful yarn', 'a bouquet in a glass vase',
    'a set of paint brushes', 'a wooden chess set', 'a basket of fresh laundry', 'a candle flickering',
    'a bowl of seashells', 'an open notebook with a pen', 'a teapot with cups', 'a key on an old table' ] },
  { name: 'vehicles-transport', orientation: 'landscape', subjects: [
    'a classic sports car on a coastal road', 'a steam locomotive in motion', 'a sailboat on open water', 'a hot air balloon over fields',
    'a vintage bicycle leaning on a wall', 'a cargo ship at sea', 'a propeller plane in a clear sky', 'a motorcycle on a mountain pass',
    'a wooden rowboat on a calm lake', 'a futuristic concept car', 'a cable car over a valley', 'a row of colorful kayaks' ] },
  { name: 'technology-objects', orientation: 'square', subjects: [
    'a sleek wireless headphone', 'a mechanical keyboard close-up', 'a vintage film camera', 'a circuit board macro',
    'a smartwatch on a stand', 'a drone hovering', 'a robotic arm in a lab', 'a glowing fiber-optic bundle',
    'a retro rotary telephone', 'a stack of computer chips', 'a modern electric scooter', 'a pair of VR goggles' ] },
  { name: 'music-instruments', orientation: 'square', subjects: [
    'a grand piano in a hall', 'an acoustic guitar close-up', 'a violin resting on sheet music', 'a drum kit under stage lights',
    'a saxophone gleaming', 'a vintage record player', 'a harp by a window', 'a trumpet with brass shine',
    'a cello in shadow', 'a set of hand drums', 'a flute on velvet', 'a synthesizer with glowing keys' ] },
  { name: 'tools-hardware', orientation: 'square', subjects: [
    'a worn leather tool roll', 'a wall of vintage hand tools', 'gleaming wrenches arranged by size', 'a carpenter’s workbench',
    'a close-up of brass gears', 'a coil of climbing rope', 'a set of paintbrushes and palette', 'a blacksmith’s anvil and hammer',
    'measuring instruments flat lay', 'a row of chisels', 'a vintage sewing machine', 'a toolbox spilling tools' ] },
  { name: 'jewelry-accessories', orientation: 'square', subjects: [
    'a diamond ring catching light', 'a string of pearls on silk', 'an ornate gold pendant', 'a stack of gemstone rings',
    'a vintage brooch', 'dangling earrings on display', 'a silver bracelet close-up', 'a treasure of mixed jewels',
    'a jade pendant on a cord', 'an antique pocket watch chain', 'a crystal necklace', 'a sapphire set in gold' ] },
  { name: 'toys-collectibles', orientation: 'square', subjects: [
    'a vintage tin robot', 'a row of wooden toy blocks', 'a teddy bear on a shelf', 'a spinning top in motion',
    'a marble collection', 'a model train on tracks', 'a kite against the sky', 'a hand-painted rocking horse',
    'a set of nesting dolls', 'a wind-up music box', 'a stack of board game pieces', 'a paper airplane mid-flight' ] },

  // ───────── art, abstract & material ─────────
  { name: 'abstract-geometric', orientation: 'square', subjects: [
    'flowing liquid metal shapes', 'concentric rippling circles', 'interlocking 3D cubes', 'a swirling fluid color gradient',
    'sharp crystalline polygons', 'soft rounded organic blobs', 'a fractal spiral pattern', 'floating translucent spheres',
    'a woven lattice of lines', 'tessellating triangles', 'a mobius-like twisted ribbon', 'layered paper-cut waves' ] },
  { name: 'textures-patterns', orientation: 'square', subjects: [
    'cracked dry earth', 'smooth river pebbles', 'rippling sand dunes texture', 'rough tree bark surface',
    'flowing water surface', 'frost crystals on glass', 'woven wicker basket weave', 'rusted metal patina',
    'marble veining close-up', 'knitted wool texture', 'honeycomb structure', 'peeling painted wood' ] },
  { name: 'pattern-surface-design', orientation: 'square', subjects: [
    'a seamless floral pattern', 'a geometric tile mosaic', 'an abstract terrazzo surface', 'a repeating leaf motif',
    'a kaleidoscopic mandala', 'an art deco repeating pattern', 'a watercolor splatter pattern', 'a marbled paper swirl',
    'a wave-like guilloché pattern', 'a polka-dot gradient field', 'an intricate paisley design', 'a woven tartan texture' ] },
  { name: 'wallpaper-backgrounds', orientation: 'landscape', subjects: [
    'a smooth color gradient backdrop', 'soft abstract bokeh lights', 'a minimalist gradient mesh', 'flowing silk-like waves',
    'a dreamy cloud gradient', 'an aurora-inspired color wash', 'a dark moody gradient with glow', 'pastel blurred shapes',
    'a vibrant liquid swirl', 'a starfield gradient', 'geometric low-poly background', 'a calm ocean gradient' ] },
  // Text-free background/wallpaper sets sized for specific formats (no UI, no type).
  { name: 'web-desktop-wallpapers', orientation: 'landscape', subjects: [ // 16:9
    'a wide minimalist gradient hero backdrop', 'a soft abstract mesh gradient in cool tones', 'a sweeping aurora light wash',
    'a wide blurred bokeh light field', 'a calm panoramic ocean gradient', 'a low-poly mountain silhouette backdrop',
    'flowing silk waves in deep blue', 'a dark moody gradient with a subtle glow', 'a frosted glass abstract texture',
    'a sunrise color wash over soft haze', 'fluid marbled ink in pastel tones', 'a nebula starfield gradient' ] },
  { name: 'mobile-wallpapers', orientation: 'portrait', subjects: [ // 9:16
    'a vertical gradient blur in twilight colors', 'a tall abstract liquid swirl', 'a vertical aurora ribbon of light',
    'soft vertical bokeh lights', 'a minimalist vertical gradient mesh', 'flowing vertical silk waves',
    'a dreamy vertical cloud gradient', 'a dark vertical gradient with a neon glow', 'pastel vertical blurred shapes',
    'a vertical starfield over distant mountains', 'a frosted vertical glass abstraction', 'a vertical sunset color wash' ] },
  { name: 'poster-art', orientation: 'poster', subjects: [ // 2:3, text-free abstract art
    'a bold minimalist abstract shape composition', 'a Bauhaus-inspired geometric arrangement', 'a Swiss-style abstract color-block layout',
    'a single dramatic gradient orb on a flat ground', 'a Risograph-textured abstract form', 'an op-art concentric pattern',
    'a midcentury abstract collage of shapes', 'a large duotone organic form', 'a flat-color sun and mountain motif',
    'a vibrant gradient arch composition', 'a minimalist line-art abstract form', 'a layered paper-cut abstract scene' ] },
  { name: 'tablet-square-backgrounds', orientation: 'square', subjects: [ // 1:1
    'a centered radial gradient backdrop', 'a square abstract mesh gradient', 'a soft square bokeh light field',
    'a symmetric mandala-like gradient', 'a square low-poly color field', 'concentric circle gradient rings',
    'a square liquid marble swirl', 'a calm square gradient wash', 'a square geometric pattern tile',
    'a dreamy square cloud gradient', 'a square starfield gradient', 'pastel square blurred shapes' ] },
  // Text-BEARING UI/web design mockups (allowText): real interface text, OCR skipped.
  { name: 'web-design', orientation: 'landscape', allowText: true, subjects: [ // 16:9
    'a SaaS landing page hero section', 'a modern analytics dashboard screen', 'an e-commerce product listing page',
    'a pricing page with three plan cards', 'a creative portfolio homepage', 'a blog article reading page',
    'a sign-up and login web form', 'a project management board UI', 'a fintech banking web dashboard',
    'a travel booking website hero', 'a music streaming web player', 'a settings page with tabs and toggles',
    'a marketing agency landing page', 'an admin CRM contacts table', 'a food delivery website menu page',
    'a real-estate listings grid page', 'a startup product feature section', 'a documentation help center page' ] },
  { name: 'mobile-design', orientation: 'portrait', allowText: true, subjects: [ // 9:16
    'a mobile banking app home screen', 'a fitness tracker app dashboard', 'a food delivery app checkout screen',
    'a mobile music player screen', 'a chat messaging conversation screen', 'a social media feed screen',
    'an onboarding walkthrough screen', 'a mobile e-commerce product page', 'a calendar and schedule app screen',
    'a weather app daily forecast screen', 'a ride-hailing app map screen', 'a login and sign-up mobile screen',
    'a profile and settings mobile screen', 'a travel itinerary mobile app', 'a habit tracker app screen',
    'a podcast player mobile screen', 'a mobile wallet and cards screen', 'a news reader mobile feed' ] },
  { name: 'app-design', orientation: 'landscape', allowText: true, subjects: [ // desktop/web application UI, 16:9
    'a desktop productivity app dashboard', 'a project management kanban app', 'a code editor IDE interface',
    'a design tool canvas workspace', 'a music production DAW interface', 'a video editing timeline app',
    'a CRM sales pipeline app', 'a team chat workspace app', 'an analytics BI dashboard app',
    'a calendar and email client app', 'a note-taking app interface', 'a spreadsheet app interface',
    'a finance budgeting app dashboard', 'a smart-home control panel app', 'a customer support helpdesk app',
    'a cloud storage file manager app', 'a habit and goal tracker app', 'an e-learning course platform app' ] },
  { name: 'materials-surfaces', orientation: 'square', subjects: [
    'molten glass swirls', 'polished marble slab', 'brushed aluminium surface', 'rough concrete wall',
    'soft velvet fabric folds', 'liquid mercury droplets', 'amber resin with inclusions', 'crumpled gold foil',
    'wet clay being shaped', 'frosted ice block', 'flowing silk fabric', 'cracked ceramic glaze' ] },
  { name: 'minerals-gemstones', orientation: 'square', subjects: [
    'a raw amethyst geode', 'a faceted emerald', 'a cluster of quartz crystals', 'a polished labradorite',
    'a chunk of pyrite cubes', 'an opal with color play', 'a slab of agate cross-section', 'a rough turquoise nugget',
    'a glittering geode interior', 'a smooth jade stone', 'a cluster of fluorite crystals', 'a piece of raw obsidian' ] },
  { name: 'light-color-studies', orientation: 'landscape', subjects: [
    'light refracting through a prism', 'colored smoke swirling', 'lens flares on dark glass', 'rainbow light on a wall',
    'neon tubes glowing in fog', 'caustic light through water', 'a spectrum of paint swatches', 'long-exposure light trails',
    'glowing color gels overlapping', 'sunlight through stained glass', 'reflections on an oil slick', 'a field of soft bokeh orbs' ] },
  { name: 'fluid-liquid', orientation: 'square', subjects: [
    'a drop hitting still water', 'swirling ink in water', 'paint mixing in slow motion', 'honey dripping slowly',
    'oil and water bubbles', 'a milk crown splash', 'colorful liquid marbling', 'champagne bubbles rising',
    'a splash frozen mid-air', 'molten wax flowing', 'a vortex in a glass', 'liquid metal beading' ] },
  { name: 'fire-smoke', orientation: 'square', subjects: [
    'a single candle flame', 'swirling colored smoke', 'embers rising from a fire', 'a campfire at night',
    'a wisp of incense smoke', 'sparks flying from metal', 'a controlled flame burst', 'smoke curling on black',
    'glowing coals close-up', 'a torch flame against dark', 'fireworks bursting', 'a match igniting' ] },
  { name: 'ice-snow-frost', orientation: 'square', subjects: [
    'a single snowflake macro', 'frost ferns on a window', 'icicles dripping in sunlight', 'a frozen bubble',
    'cracked lake ice', 'snow piled on a branch', 'crystals on a frozen leaf', 'an ice cave glowing blue',
    'fresh powder snow texture', 'frozen berries on a twig', 'an iceberg in still water', 'snowflakes on dark wool' ] },
  { name: 'paper-craft-art', orientation: 'square', subjects: [
    'layered paper-cut mountains', 'an origami crane', 'a quilled paper flower', 'a pop-up paper scene',
    'folded paper geometric forms', 'a paper diorama of a forest', 'torn paper collage', 'a paper boat on blue paper',
    'intricate cut-paper lace', 'a 3D paper sculpture', 'rolled paper spirals', 'a paper craft cityscape' ] },
  { name: 'fantasy-mythical', orientation: 'portrait', subjects: [
    'a glowing enchanted forest', 'a floating island in the sky', 'a crystal cave with glowing gems', 'a mystical portal of light',
    'an ancient tree of life', 'a fairy-tale castle on a cliff', 'a luminous mushroom village', 'a celestial being of light',
    'a magical waterfall of stars', 'a misty valley with floating lanterns', 'a hidden glade with glowing pools', 'a dragon’s mountain lair' ] },
  { name: 'scifi-futuristic', orientation: 'landscape', subjects: [
    'a sleek spaceship in orbit', 'a futuristic neon megacity', 'a robot exploring a desert', 'a space station interior',
    'a hovering vehicle over a city', 'a distant colony dome', 'an android in a lab', 'a wormhole in deep space',
    'a solar array in space', 'a futuristic monorail', 'a cyberpunk alley in the rain', 'a terraformed alien valley' ] },

  // ───────── science, industry, land use ─────────
  { name: 'microscopic-science', orientation: 'square', subjects: [
    'crystals under a microscope', 'a pollen grain close-up', 'colorful cell structures', 'a snow crystal lattice',
    'bacteria-like organic shapes', 'mineral crystal growth', 'a fractal frost pattern', 'soap film interference colors',
    'a butterfly wing scale macro', 'a leaf cell structure', 'salt crystal formation', 'a feather barbule macro' ] },
  { name: 'industrial-machinery', orientation: 'landscape', subjects: [
    'gleaming factory pipes', 'a row of turbines', 'gears meshing in a machine', 'a robotic assembly line',
    'a power plant cooling tower', 'steel beams of a structure', 'a control panel of dials', 'a crane against the sky',
    'a wind farm at sunset', 'an oil refinery at night', 'a conveyor belt of parts', 'a hydroelectric dam' ] },
  { name: 'agriculture-farming', orientation: 'landscape', subjects: [
    'rows of grapevines at sunset', 'a golden wheat field swaying', 'a tractor in a plowed field', 'a sunflower field to the horizon',
    'terraced tea plantations', 'a lavender farm in bloom', 'a greenhouse interior', 'an orchard heavy with fruit',
    'rice paddies reflecting sky', 'a barn beside a cornfield', 'bales of hay in a field', 'a vegetable garden in rows' ] }
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

// Dimensions for text-BEARING UI/web design categories (allowText). Crossed with
// the subject instead of the artistic style/lighting/palette dimensions, which make
// no sense for interface mockups.
export const DESIGN_DIMENSIONS = {
  aesthetic: [
    'flat design', 'material design', 'neumorphic UI', 'glassmorphism', 'minimal clean UI',
    'bold modern UI', 'skeuomorphic detail', 'brutalist web design', 'soft rounded cards', 'gradient-rich UI',
    'monochrome editorial', 'corporate clean', 'playful colorful UI', 'iOS native style', 'Material You',
    'Swiss grid layout', 'data-dense dashboard', 'big-type hero layout', 'card-based layout', 'sleek dark UI'
  ],
  theme: ['light theme', 'dark theme', 'high-contrast theme', 'pastel theme', 'vibrant theme', 'muted neutral theme'],
  accent: ['blue accent', 'indigo accent', 'green accent', 'orange accent', 'teal accent', 'pink accent', 'monochrome accent']
};

// Orientation -> default Codex image size.
export const ORIENTATION_SIZE = {
  square: '2048x2048',
  landscape: '3840x2160', // 16:9 (web / desktop)
  portrait: '2160x3840', // 9:16 (mobile)
  poster: '1024x1536' // 2:3 (poster art)
};
