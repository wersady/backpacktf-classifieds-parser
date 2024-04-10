import WebSocket from 'ws';
import ReconnectingWebSocket from 'reconnecting-websocket';

/*
    PUT YOUR BACKPACK.TF API TOKEN HERE
*/
const bpApiToken = "";

/*
    Other settings you might want to change
*/

// Show non-unusual items that are listed for under buyorders. Stuff like paints and strange parts makes this misfire a lot.
const showArbitrage = false;

// Add users to a "ban list" so their listings won't show up.
let bannedUsers = [];

bannedUsers[76561197960287930n] = true; // Example ban, copy/paste and replace the steamID with the user you want to ban, keep the n and the end.

/*
    You can ignore everything past this point.
*/

const ws = new ReconnectingWebSocket(
    'wss://ws.backpack.tf/events',
    undefined,
    { WebSocket: WebSocket, headers: { 'batch-test': true } }
);

ws.addEventListener('open', () => {
    console.log('Connection has been made\n');
});

ws.addEventListener('close', () => {
    console.log('Connection closed unexpectedly, reconnecting...\n');
});

/* Example payload for reference
{
  id: '440_76561199388511269_a05a1a38f8287b9571a02853ee33bd63',
  steamid: '76561199388511269',
  appid: 440,
  currencies: { metal: 1.11, keys: 42 },
  value: { raw: 2621.28, short: '42.02 keys', long: '42 keys, 1.11 ref' },
  tradeOffersPreferred: true,
  buyoutOnly: true,
  details: '[⚡24/7 INSTANT⚡] - 𝟒𝟐 𝐤𝐞𝐲𝐬, 𝟏.𝟏𝟏 𝐫𝐞𝐟, !sell Mystical Medley Polar Bear'            ,
  listedAt: 1701374102,
  bumpedAt: 1701373862,
  intent: 'buy',
  count: 1,
  status: 'active',
  source: 'userAgent',
  item: {
    appid: 440,
    baseName: 'Polar Bear',
    defindex: 30964,
    id: '',
    imageUrl: 'https://steamcdn-a.akamaihd.net/apps/440/icons/dec17_polar_bear.4e79c1e0208173b544957bf913ca63778e418c22.png',
    marketName: 'Unusual Polar Bear',
    name: 'Mystical Medley Polar Bear',
    origin: null,
    originalId: '',
    price: { steam: [Object] },
    quality: { id: 5, name: 'Unusual', color: '#8650AC' },
    summary: 'Level 1-100 Hat',
    class: [ 'Heavy' ],
    slot: 'misc',
    particle: {
      id: 128,
      name: 'Mystical Medley',
      shortName: 'medley',
      imageUrl: '/images/440/particles/128_94x94.png',
      type: 'standard'
    },
    tradable: true,
    craftable: true,
    priceindex: '128'
  },
  userAgent: {
    client: 'TF2Autobot - Run your own bot for free',
    lastPulse: 1701373918
  },
  user: {
    id: '76561199388511269',
    name: 'Liquid.tf 🌊 24/7',
    avatar: 'https://avatars.steamstatic.com/c31d18ad931fd685ca3af5700db6a461e10bcfe8_medium.jpg',
    avatarFull: 'https://avatars.steamstatic.com/c31d18ad931fd685ca3af5700db6a461e10bcfe8_full.jpg',
    premium: true,
    online: true,
    banned: false,
    customNameStyle: 'awesome5',
    acceptedSuggestions: 0,
    class: 'awesome5',
    style: '',
    role: null,
    tradeOfferUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=1428245541&token=YSebl1Kg',
    isMarketplaceSeller: false,
    flagImpersonated: null,
    bans: []
  }
}
*/

ws.addEventListener('message', (event) => {
    const json = JSON.parse(event.data);

    // forwards-compatible support of the batch mode, if you did not set the batch-test header.
    if (json instanceof Array) {
        json.forEach(handleEvent); // handles the new event format
    } else {
        handleEvent(json); // old event-per-frame message format - DEPRECATED!
    }
});

function handleEvent(e) {
    const listing = e.payload;
    try {
        if (listing.intent == 'sell' && listing.item.quality.id == 5 && listing.source != 'userAgent' && listing.bumpedAt == listing.listedAt && !bannedUsers[listing.steamid]) {
            queue.push(listing);
        } else if (listing.intent == 'sell' && listing.bumpedAt == listing.listedAt && !bannedUsers[listing.steamid]) {
            //console.log(listing);
            if (queue.length < 30) {
                queue.push(listing);
                //console.log(queue.length);
            }
        }
    }
    catch(err) {
        console.log("Error fetching payload: " + err);
    }
    
}

// Get a buyorder.
async function getBuyOrder(listing) {
    let result = {keys: 0, metal: 0};
    await fetch('https://backpack.tf/api/classifieds/listings/snapshot?token=' + bpApiToken + '&sku=' + listing.item.name + '&appid=440', {
          method: 'GET',
          headers: {
          'Content-type': 'application/json; charset=UTF-8',
          },
    })
    // Parse JSON data
    .then((response) => response.json())
                
    // Showing response
    .then((buyOrderJson) => {
          for (let i = 0; i < buyOrderJson.listings.length; i++) {
                const itemAtts = buyOrderJson.listings[i].item.attributes;
                let isItemModified = false;
                for (let j = 0; j < itemAtts.length; j++) {
                    if (itemAtts[j].defindex >= 1004 && itemAtts[j].defindex <= 1009) {
                        isItemModified = true;
                        break;
                    }
                }
                if (buyOrderJson.listings[i].intent == "buy" && isItemModified == false) {
                        result.keys = buyOrderJson.listings[i].currencies.keys == undefined ? 0 : buyOrderJson.listings[i].currencies.keys;
                        result.metal = buyOrderJson.listings[i].currencies.metal == undefined ? 0 : buyOrderJson.listings[i].currencies.metal;
                        break;
                }
          }    
    })
    .catch(err => {
          return undefined;
    });
    return result;    
}

let queue = [];

setInterval(async ()=> {
    if (queue.length > 0) {
        const listing = queue[0];
        // Get the highest buyorder for the listings.
        const buyorder = await getBuyOrder(listing);
        let listingLink = "";
        try {
            listingLink = "https://backpack.tf/classifieds?item=" + listing.item.baseName + "&quality=" + listing.item.quality.id + "&particle=" + listing.item.particle.id;
            listingLink = listingLink.replace(/ /g, "%20").replace(/'/g, "%27");
        } catch(err) {
            try {
                listingLink = "https://backpack.tf/classifieds?item=" + listing.item.baseName + "&quality=" + listing.item.quality.id;
                listingLink = listingLink.replace(/ /g, "%20").replace(/'/g, "%27");
            } catch(err2) {
                listingLink = "Error creating classifieds link";
            }
        }
        if (showArbitrage && (buyorder.keys > listing.currencies.keys || buyorder.keys == listing.currencies.keys && buyorder.metal > listing.currencies.metal)) {
            console.log('POTENTIAL ARBITRAGE --> ' + listing.item.name + '. Seller: ' + listing.value.long + '. Highest buyer: ' + buyorder.keys + ' keys, ' + buyorder.metal + ' ref');
            console.log("* " + listingLink + "\n");
        } else if (listing.intent == 'sell' && listing.item.quality.id == 5) {
            console.log(listing.item.name + '. Seller: ' + listing.value.long + '. Highest buyer: ' + buyorder.keys + ' keys, ' + buyorder.metal + ' ref');
            console.log("* " + listingLink + "\n");
        }

        queue.shift();
        //console.log(queue.length);       
    }
}, 1500);