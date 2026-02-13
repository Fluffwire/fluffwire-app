<script setup lang="ts">
import { ref, computed } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-vue-next'

const emit = defineEmits<{ select: [emoji: string] }>()

// Emoji name lookup for search (lowercase keywords)
const emojiNames: Record<string, string> = {
  '😀':'grinning happy smile glad','😃':'smiley happy smile glad','😄':'smile happy glad joy','😁':'grin beam happy','😆':'laughing satisfied haha','😅':'sweat smile nervous','🤣':'rofl rolling floor laughing','😂':'joy tears laughing cry','🙂':'slightly smiling','😊':'blush happy smile shy','😇':'innocent angel halo','🥰':'smiling hearts love','😍':'heart eyes love','🤩':'star struck excited wow','😘':'kissing heart love blow kiss','😗':'kissing','😋':'yum delicious tasty food','😛':'tongue out playful','😜':'wink tongue crazy','🤪':'zany crazy wild silly','😝':'squinting tongue','🤑':'money face rich dollar','🤗':'hugging hug open arms','🤭':'giggle hand over mouth','🤫':'shushing quiet secret','🤔':'thinking hmm wonder','😐':'neutral expressionless','😑':'expressionless blank','😶':'no mouth silent','😏':'smirk sly','😒':'unamused annoyed','🙄':'rolling eyes whatever','😬':'grimace awkward','😮‍💨':'exhale sigh relief','🤥':'lying pinocchio','😌':'relieved calm peaceful','😔':'pensive sad thoughtful','😪':'sleepy tired','🤤':'drooling','😴':'sleeping zzz','😷':'mask sick','🤒':'sick thermometer fever','🤕':'hurt bandage injured','🤢':'nauseated sick green','🤮':'vomit throw up sick','🥵':'hot sweating','🥶':'cold freezing','🥴':'woozy dizzy drunk','😵':'dizzy spiral','🤯':'exploding head mind blown','🤠':'cowboy hat','🥳':'party celebrate birthday','🥸':'disguise glasses mustache','😎':'cool sunglasses','🤓':'nerd glasses geek','🧐':'monocle curious','😕':'confused','😟':'worried','🙁':'slightly frowning sad','😮':'open mouth surprised','😯':'hushed surprised','😲':'astonished shocked wow','😳':'flushed embarrassed','🥺':'pleading puppy eyes','😦':'frowning open mouth','😧':'anguished','😨':'fearful scared','😰':'anxious sweat worried','😥':'sad relieved disappointed','😢':'crying tear sad','😭':'sobbing loud crying sad','😱':'screaming fear horror','😖':'confounded','😣':'persevering','😞':'disappointed sad','😓':'downcast sweat','😩':'weary tired','😫':'tired exhausted','🥱':'yawning sleepy bored','😤':'triumph huffing angry','😡':'angry rage red','😠':'angry mad','🤬':'cursing swearing angry','😈':'devil smiling evil','👿':'imp angry devil','💀':'skull dead death','☠️':'skull crossbones death danger','💩':'poop poo shit','🤡':'clown','👹':'ogre monster','👺':'goblin tengu','👻':'ghost boo halloween','👽':'alien ufo extraterrestrial','👾':'space invader monster game','🤖':'robot bot',
  '👋':'wave hello hi bye','🤚':'raised back hand stop','🖐️':'hand fingers splayed','✋':'raised hand stop high five','🖖':'vulcan spock','👌':'ok okay perfect','🤌':'pinched fingers italian','🤏':'pinching small tiny','✌️':'peace victory','🤞':'crossed fingers luck','🤟':'love you gesture','🤘':'rock on metal horns','🤙':'call me shaka hang loose','👈':'pointing left','👉':'pointing right','👆':'pointing up','🖕':'middle finger','👇':'pointing down','☝️':'index pointing up','👍':'thumbs up like good yes','👎':'thumbs down dislike bad no','✊':'fist raised','👊':'fist bump punch','🤛':'left fist bump','🤜':'right fist bump','👏':'clap applause','🙌':'raising hands celebrate','👐':'open hands','🤲':'palms up','🤝':'handshake deal','🙏':'pray please thank you namaste','✍️':'writing','💅':'nail polish','🤳':'selfie','💪':'muscle strong bicep flex','🦾':'mechanical arm prosthetic','🦿':'mechanical leg prosthetic',
  '❤️':'red heart love','🧡':'orange heart','💛':'yellow heart','💚':'green heart','💙':'blue heart','💜':'purple heart','🖤':'black heart','🤍':'white heart','🤎':'brown heart','💔':'broken heart','❣️':'heart exclamation','💕':'two hearts','💞':'revolving hearts','💓':'beating heart','💗':'growing heart','💖':'sparkling heart','💘':'heart arrow cupid','💝':'heart ribbon gift','💟':'heart decoration',
  '🐶':'dog puppy','🐱':'cat kitty','🐭':'mouse','🐹':'hamster','🐰':'rabbit bunny','🦊':'fox','🐻':'bear','🐼':'panda','🐻‍❄️':'polar bear','🐨':'koala','🐯':'tiger','🦁':'lion','🐮':'cow','🐷':'pig','🐸':'frog','🐵':'monkey','🙈':'see no evil monkey','🙉':'hear no evil monkey','🙊':'speak no evil monkey','🐒':'monkey','🐔':'chicken','🐧':'penguin','🐦':'bird','🐤':'baby chick','🐣':'hatching chick','🐥':'front facing chick','🦆':'duck','🦅':'eagle','🦉':'owl','🦇':'bat','🐺':'wolf','🐗':'boar','🐴':'horse','🦄':'unicorn','🐝':'bee honey','🪱':'worm','🐛':'bug caterpillar','🦋':'butterfly','🐌':'snail','🐞':'ladybug','🐜':'ant','🪰':'fly','🪲':'beetle','🪳':'cockroach','🦟':'mosquito','🦗':'cricket','🕷️':'spider','🐢':'turtle','🐍':'snake','🦎':'lizard','🦖':'t-rex dinosaur','🦕':'dinosaur sauropod','🐙':'octopus','🦑':'squid','🦐':'shrimp','🦞':'lobster','🦀':'crab','🐡':'blowfish','🐠':'tropical fish','🐟':'fish','🐬':'dolphin','🐳':'whale spouting','🐋':'whale','🦈':'shark','🐊':'crocodile',
  '🍎':'apple red','🍐':'pear','🍊':'orange tangerine','🍋':'lemon','🍌':'banana','🍉':'watermelon','🍇':'grapes','🍓':'strawberry','🫐':'blueberries','🍈':'melon','🍒':'cherry','🍑':'peach','🥭':'mango','🍍':'pineapple','🥥':'coconut','🥝':'kiwi','🍅':'tomato','🥑':'avocado','🍆':'eggplant aubergine','🌶️':'hot pepper chili','🫑':'bell pepper','🥒':'cucumber','🥬':'leafy green','🥦':'broccoli','🧅':'onion','🧄':'garlic','🥔':'potato','🍠':'sweet potato','🥐':'croissant','🥖':'baguette bread','🍞':'bread','🥨':'pretzel','🥯':'bagel','🧀':'cheese','🥚':'egg','🍳':'cooking fried egg','🧈':'butter','🥞':'pancakes','🧇':'waffle','🥓':'bacon','🥩':'meat steak','🍗':'chicken leg','🍖':'meat bone','🌭':'hot dog','🍔':'hamburger burger','🍟':'french fries','🍕':'pizza','🫓':'flatbread','🥪':'sandwich','🌮':'taco','🌯':'burrito','🫔':'tamale','🥙':'pita','🧆':'falafel','🥗':'salad','🍝':'spaghetti pasta','🍜':'noodles ramen','🍲':'pot food stew','🍛':'curry rice','🍣':'sushi','🍱':'bento box','🥟':'dumpling','🦪':'oyster','🍤':'shrimp prawn','🍙':'rice ball onigiri','🍚':'rice','🍘':'rice cracker','🍥':'fish cake','🥠':'fortune cookie','🥮':'moon cake','🍢':'oden skewer','🍡':'dango','🍧':'shaved ice','🍨':'ice cream','🍦':'soft ice cream cone','🥧':'pie','🧁':'cupcake','🍰':'cake shortcake','🎂':'birthday cake','🍮':'custard pudding flan','🍭':'lollipop candy','🍬':'candy sweet','🍫':'chocolate bar','🍿':'popcorn','🍩':'doughnut donut','🍪':'cookie','🌰':'chestnut','🥜':'peanuts','🍯':'honey',
  '⚽':'soccer football','🏀':'basketball','🏈':'american football','⚾':'baseball','🥎':'softball','🎾':'tennis','🏐':'volleyball','🏉':'rugby','🥏':'frisbee disc','🎱':'billiards pool','🪀':'yo-yo','🏓':'ping pong table tennis','🏸':'badminton','🏒':'ice hockey','🥅':'goal net','⛳':'golf','🪃':'boomerang','🏹':'bow arrow archery','🎣':'fishing','🤿':'diving mask snorkel','🥊':'boxing glove','🥋':'martial arts karate','🎽':'running shirt','🛹':'skateboard','🛼':'roller skate','🛷':'sled','⛸️':'ice skating','🥌':'curling','🎿':'skiing','⛷️':'skier','🏂':'snowboarder','🪂':'parachute','🎪':'circus tent','🎭':'theater drama masks','🎨':'art painting palette','🎬':'clapper board movie film','🎤':'microphone karaoke','🎧':'headphone music','🎼':'musical score','🎹':'piano keyboard music','🥁':'drum','🪘':'drum long','🎷':'saxophone','🎺':'trumpet','🪗':'accordion','🎸':'guitar','🪕':'banjo','🎻':'violin','🎲':'dice game','♟️':'chess pawn','🎯':'bullseye target dart','🎳':'bowling','🎮':'video game controller','🕹️':'joystick','🎰':'slot machine',
  '💡':'light bulb idea','🔦':'flashlight','🕯️':'candle','📱':'mobile phone','💻':'laptop computer','⌨️':'keyboard','🖥️':'desktop computer','🖨️':'printer','🖱️':'mouse computer','💾':'floppy disk save','💿':'cd disc','📀':'dvd','🎥':'movie camera','🎞️':'film frames','📷':'camera','📸':'camera flash','📹':'video camera','📞':'telephone','☎️':'telephone','📟':'pager','📠':'fax','📺':'television tv','📻':'radio','🎙️':'studio microphone','🎚️':'level slider','🎛️':'control knobs','⏱️':'stopwatch','⏲️':'timer clock','⏰':'alarm clock','🕰️':'mantelpiece clock','🔔':'bell notification','🔕':'bell mute silent','📣':'megaphone','📢':'loudspeaker','💰':'money bag','🪙':'coin','💴':'yen','💵':'dollar money','💶':'euro','💷':'pound','💳':'credit card','💎':'gem diamond','⚖️':'balance scale','🪜':'ladder','🧰':'toolbox','🪛':'screwdriver','🔧':'wrench','🔨':'hammer','⚒️':'hammer pick','🛠️':'hammer wrench tools','🔩':'nut bolt','⚙️':'gear cog settings','🪤':'mouse trap','🔗':'link chain','⛓️':'chains','🧲':'magnet','🔫':'gun water pistol','💣':'bomb','🧨':'firecracker dynamite','🪓':'axe','🔪':'knife','🗡️':'dagger sword','🛡️':'shield','🚬':'cigarette smoking','⚰️':'coffin','🪦':'headstone gravestone','⚱️':'urn','🏺':'amphora vase','🔮':'crystal ball','📿':'prayer beads','🧿':'nazar evil eye','💈':'barber pole','⚗️':'alembic chemistry','🔭':'telescope','🔬':'microscope','🕳️':'hole','🩹':'bandage','🩺':'stethoscope','💊':'pill medicine','💉':'syringe needle','🩸':'blood drop','🧬':'dna','🦠':'microbe virus bacteria','🧫':'petri dish','🧪':'test tube',
  '✅':'check mark done yes','❌':'cross mark no wrong','❓':'question mark','❗':'exclamation mark warning','‼️':'double exclamation','⁉️':'exclamation question','💯':'hundred percent perfect','🔥':'fire hot lit flame','✨':'sparkles stars magic','⭐':'star','🌟':'glowing star','💫':'dizzy star','💥':'collision boom bang','💢':'anger symbol','💨':'dash wind fast','💦':'sweat drops water','🕊️':'dove peace','🎵':'music note','🎶':'music notes','🔇':'muted speaker','🔈':'speaker low','🔉':'speaker medium','🔊':'speaker loud volume','📌':'pushpin pin','📍':'round pushpin location','🏁':'checkered flag finish race','🚩':'triangular flag red flag','🏳️':'white flag surrender','🏴':'black flag','🏳️‍🌈':'rainbow flag pride lgbtq','🏳️‍⚧️':'transgender flag','♻️':'recycling','✔️':'check mark','☑️':'ballot box check','➕':'plus add','➖':'minus subtract','➗':'divide','✖️':'multiply','♾️':'infinity','💲':'dollar sign money','💱':'currency exchange','©️':'copyright','®️':'registered','™️':'trademark',
}

const categories = [
  {
    name: 'Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    name: 'Gestures',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
  },
  {
    name: 'Animals',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊'],
  },
  {
    name: 'Food',
    emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆','🌶️','🫑','🥒','🥬','🥦','🧅','🧄','🥔','🍠','🥐','🥖','🍞','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🌮','🌯','🫔','🥙','🧆','🥗','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯'],
  },
  {
    name: 'Activities',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥅','⛳','🪃','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰'],
  },
  {
    name: 'Objects',
    emojis: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','🎥','🎞️','📷','📸','📹','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','🔔','🔕','📣','📢','💰','🪙','💴','💵','💶','💷','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','🔩','⚙️','🪤','🔗','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪'],
  },
  {
    name: 'Symbols',
    emojis: ['✅','❌','❓','❗','‼️','⁉️','💯','🔥','✨','⭐','🌟','💫','💥','💢','💨','💦','🕊️','🎵','🎶','🔇','🔈','🔉','🔊','📌','📍','🏁','🚩','🏳️','🏴','🏳️‍🌈','🏳️‍⚧️','♻️','✔️','☑️','➕','➖','➗','✖️','♾️','💲','💱','©️','®️','™️'],
  },
]

const activeCategory = ref(0)
const searchQuery = ref('')

const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories
  const q = searchQuery.value.toLowerCase()
  return categories
    .map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((e) => {
        // Match against emoji character itself or keyword names
        if (e.includes(q)) return true
        const names = emojiNames[e]
        if (!names) return false
        return q.split(/\s+/).every((word) => names.includes(word))
      }),
    }))
    .filter((cat) => cat.emojis.length > 0)
})

const displayCategories = computed(() => {
  if (searchQuery.value) return filteredCategories.value
  const cat = categories[activeCategory.value]
  return cat ? [cat] : []
})

function selectEmoji(emoji: string) {
  emit('select', emoji)
}
</script>

<template>
  <div class="w-[320px] rounded-lg border border-border bg-popover shadow-lg">
    <!-- Search -->
    <div class="relative px-2 pt-2">
      <Search class="absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="searchQuery"
        placeholder="Search emoji..."
        class="h-8 pl-8 text-sm"
      />
    </div>

    <!-- Category tabs -->
    <div v-if="!searchQuery" class="flex gap-1 border-b border-border/50 px-2 py-1.5">
      <button
        v-for="(cat, i) in categories"
        :key="cat.name"
        @click="activeCategory = i"
        :class="[
          'rounded px-1.5 py-0.5 text-lg transition-colors',
          activeCategory === i ? 'bg-accent' : 'hover:bg-accent/50',
        ]"
        :title="cat.name"
      >
        {{ cat.emojis[0] }}
      </button>
    </div>

    <!-- Emoji grid -->
    <ScrollArea class="h-[240px]">
      <div class="p-2">
        <template v-if="displayCategories.length > 0">
          <div
            v-for="cat in displayCategories"
            :key="cat.name"
          >
            <div v-if="searchQuery" class="mb-1 text-xs font-semibold text-muted-foreground">
              {{ cat.name }}
            </div>
            <div class="grid grid-cols-8 gap-0.5">
              <button
                v-for="emoji in cat.emojis"
                :key="emoji"
                @click="selectEmoji(emoji)"
                class="flex h-8 w-8 items-center justify-center rounded text-xl transition-colors hover:bg-accent"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </template>
        <div v-else class="py-8 text-center text-sm text-muted-foreground">
          No emojis found
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
