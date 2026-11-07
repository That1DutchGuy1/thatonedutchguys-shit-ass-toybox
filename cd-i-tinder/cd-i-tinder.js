'use strict';

const characters = [
  {
    id: "harkinian",
    name: "King Harkinian",
    age: "Royal (age unclear, ancient)",
    gender: "Male 👑",
    bio: "Just looking for a fine dinner, mah boi. If you don't bring the ship-sailor, don't even bother swiping right. Hobbies: wondering what's for dinner, shouting at my daughter, occasionally saving the kingdom from my throne.",
    img: "./assets/images/king-harkinian.png"  },
  {
    id: "link",
    name: "Link",
    age: "Teen Hero",
    gender: "Male 🗡️",
    bio: "Gee, it sure is boring around here! Just a boy trying to get a kiss from the Princess. Swipe right if you're down to bomb some Dodongos and hang out in Zelda's room.",
    img: "./assets/images/link.jpg"  },
  {
    id: "zelda",
    name: "Princess Zelda",
    age: "Royal, teens",
    gender: "Female 👸",
    bio: "Ruling Koridai is a full-time job. Looking for an actual hero, but currently stuck with a blonde guy who complains about being bored. Don't ask me for a kiss right away.",
    img: "./assets/images/zelda.jpg"  
  },
  {
    id: "morshu",
    name: "Morshu",
    age: "Business Owner",
    gender: "Male 💰",
    bio: "Lamp oil? Rope? Bombs? You want it? It's yours, my friend, as long as you have enough rubies. Not looking for gold diggers — and I can't give credit!",
    img: "./assets/images/morshu.jpg"
  },
  {
    id: "gwonam",
    name: "Gwonam",
    age: "Ancient",
    gender: "Wizard 📜",
    bio: "I own a magic carpet and I'm not afraid to use it. Looking for someone to fly to Koridai with. It is written that we are a perfect match.",
    img: "./assets/images/gwonam.png"
  },
  {
    id: "onkled",
    name: "Duke Onkled",
    age: "Traitor (nervous energy)",
    gender: "Male 🏰",
    bio: "Please! Have mercy! I'm just a simple Duke trying to survive. Swipe right and I promise I won't betray you to Ganon... probably. (Best photo I could manage, my hands wouldn't stop shaking.)",
    img: "./assets/images/onkled.png"
  },
  {
    id: "ganon",
    name: "Ganon",
    age: "Evil Incarnate",
    gender: "Male 😈",
    bio: "Join me, and I will make your face the greatest in Koridai! Or else you will DIE! Must love dark pits, roaring, and a good villain monologue.",
    img: "./assets/images/ganon.jpg"
  },
];

let currentIndex = 0;
let currentMatch = null;
let typingDiv = null;

const swipeView = document.getElementById('swipe-view');
const matchView = document.getElementById('match-view');
const chatView = document.getElementById('chat-view');
const dateView = document.getElementById('date-view');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');

const cannedReplies = {
  harkinian: ["Mah boi!", "I wonder what's for dinner...", "OAAHAHAHAHAHA!", "Enough! My ship sails in the morning!", "After you've scrubbed all the floors in Hyrule, then we can talk about mercy!"],
  link: ["Gee, it sure is boring around here!", "I just wonder what Ganon is up to", "Well excuuuuse me, Princess!", "I can't wait to bomb some Dodongos!"],
  zelda: ["You've got to be kidding.", "Father!", "Good.", "A whole month gone, and still no word!"],
  morshu: ["Lamp oil, rope, bombs? You want it?", "Sorry, I can't give credit!", "It's yours, my friend!"],
  gwonam: ["Squadala! We are off!", "It is written...", "Look and see!", "You must conquer each"],
  onkled: ["Please! Your omnipotence! Have mercy!", "D-Don't hurt me! I'll tell you the secret way into Reesong Palace", "I'm under attack by the evil forces of Ganon!"],
  ganon: ["YOU DARE MESSAGE ME?!", "Join me, or else you will DIE!", "Your face will be the greatest in Koridai!", "No! Not into the pit! IT BURNS!", "YOU MUST DIE!"]
};

function getCharacterReply() {
  const lines = cannedReplies[currentMatch.id] || ["..."];
  return lines[Math.floor(Math.random() * lines.length)];
}

function loadProfile() {
  if (currentIndex >= characters.length) currentIndex = 0;
  const character = characters[currentIndex];
  document.getElementById('prof-img').src = character.img;
  document.getElementById('prof-name').innerText = character.name;
  document.getElementById('prof-age').innerText = character.age;
  document.getElementById('prof-gender').innerText = character.gender;
  document.getElementById('prof-bio').innerText = character.bio;
}

function swipeLeft() {
  currentIndex++;
  loadProfile();
}

function swipeRight() {
  currentMatch = characters[currentIndex];
  document.getElementById('match-name').innerText = currentMatch.name;
  document.getElementById('match-img').src = currentMatch.img;
  swipeView.style.display = 'none';
  matchView.style.display = 'flex';
}

function backToSwiping() {
  matchView.style.display = 'none';
  chatView.style.display = 'none';
  dateView.style.display = 'none';
  currentIndex++;
  loadProfile();
  swipeView.style.display = 'flex';
}

function openChat() {
  matchView.style.display = 'none';
  chatView.style.display = 'flex';
  document.getElementById('chat-name').innerText = currentMatch.name;
  document.getElementById('chat-avatar').src = currentMatch.img;
  chatBox.innerHTML = '';
  showTyping();
  window.setTimeout(() => {
    removeTyping();
    receiveMessage(getCharacterReply());
  }, 350);
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  addMessageToDOM(text, 'msg-me');
  chatInput.value = '';
  showTyping();
  window.setTimeout(() => {
    removeTyping();
    receiveMessage(getCharacterReply());
  }, 350);
}

function receiveMessage(text) {
  addMessageToDOM(text, 'msg-them');
}

function addMessageToDOM(text, className) {
  const message = document.createElement('div');
  message.className = 'message ' + className;
  message.innerText = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  typingDiv = document.createElement('div');
  typingDiv.className = 'message msg-typing';
  typingDiv.innerText = currentMatch.name + ' is typing...';
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  if (typingDiv) {
    typingDiv.remove();
    typingDiv = null;
  }
}

const dateStories = {
  harkinian: "King Harkinian whisks you to a candlelit royal banquet, where he insists you try every dish before his ship sails to Gamelon. Just as dessert is served, he leaps up to investigate a suspicious noise in the kitchen. You end the evening sharing the last slice of cake while he declares it the finest dinner in the kingdom of Hyrule.",
  link: "Link plans a grand adventure date, but gets distracted by a cave full of treasure on the way to the picnic. After a heroic detour involving a suspicious number of bombs, he arrives with a single flower and an enormous grin. You spend sunset swapping stories while he asks if you know any good places to bomb some Dodongos.",
  zelda: "Zelda invites you to a quiet balcony overlooking Koridai, hoping for one evening without royal emergencies nor that annoying blonde guy interrupting her plans. She relaxes as you share snacks and trade dry observations about palace life. When a guard interrupts with yet another request, she takes your hand and sneaks you both out to watch Link being a total idiot instead.",
  morshu: "Morshu closes his shop early and lays out a picnic beside the market, complete with more provisions than two people could possibly need. He tries to charge you one ruby for the first toast, then laughs and admits the evening is on the house. You stroll through the quiet stalls as he dreams up increasingly ridiculous names for your next date.",
  gwonam: "Gwonam sweeps you away on his magic carpet for a moonlit tour of Koridai. He points out distant ruins with the confidence of a guide who may or may not know where he is going. The carpet lands at a hilltop overlook, where the two of you share a peaceful snack beneath the stars before flying home.",
  onkled: "Duke Onkled arranges a discreet dinner in a little garden, checking over his shoulder every time a twig snaps. Once he realizes nobody is gonna make him scrub all the floors in Hyrule, he finally relaxes enough to tell you the story of his most disastrous banquet. You leave with a new ally and his very earnest promise not to betray you before the next date.",
  ganon: "Ganon declares your date will take place in a dramatically lit throne room and prepares a feast fit for a conqueror. He spends the first course boasting about his plans, but your questions catch him off guard and the evening turns into an unexpectedly lively debate. By dessert, he is already plotting a rematch—this time at a much less ominous restaurant."
};

function goOnDate() {
  if (!currentMatch) return;
  chatView.style.display = 'none';
  dateView.style.display = 'flex';
  document.getElementById('date-name').innerText = currentMatch.name;
  document.getElementById('date-avatar').src = currentMatch.img;
  document.getElementById('date-title').innerText = 'Your date with ' + currentMatch.name;
  document.getElementById('date-scene').innerText = dateStories[currentMatch.id];
}

function backToChat() {
  dateView.style.display = 'none';
  chatView.style.display = 'flex';
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  switch (button.dataset.action) {
    case 'home': window.location.href = '../index.html'; break;
    case 'pass': swipeLeft(); break;
    case 'like': swipeRight(); break;
    case 'open-chat': openChat(); break;
    case 'back-to-swiping': backToSwiping(); break;
    case 'send-message': sendMessage(); break;
    case 'go-on-date': goOnDate(); break;
    case 'back-to-chat': backToChat(); break;
  }
});

chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') sendMessage();
});

loadProfile();
