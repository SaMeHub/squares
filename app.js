/* squares.mehlhase.info */
/* (c) Sascha Mehlhase - kontakt@mehlhase.info */
/* game idea: Sascha Mehlhase */

// Registering Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("./sw.js", { scope: "./" });
}

let g_int = {'l': 3, 'h': 6};
let r_int = {'l': 2, 'h': g_int.h};
let n_int = {'l': 10, 'h': 500};
let s_int = {'l': 0, 'h': 32000};

let g = g_int.l; // grid size (g x g)
let r = r_int.l; // rotator size (m x m)
let p = 0; // position of move area (m x m) within grid (g x g)
let n = n_int.l; // number of shuffles
let s = s_int.l; // random-number seed
let moves = 0; // # moves in game
let rots = 0; // # rotations in game
let game = false;
let p_opt = null;
let menu = null;
let board = null;
let instructions = null;
let installInstr = null;
let solved = null;
let overlayed = null;
let moveList = null;
let touchstart = {'x': 0, 'y': 0, 'rot': false, 'col': null, 'row': null};
let touchend = {'x': 0, 'y': 0, 'rot': false, 'col': null, 'row': null};

let deferredPrompt;

function mulberry32(seed) {
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

window.onload = function() {
  menu = document.querySelector(".menu");
  board = document.querySelector(".board");
  instructions = document.querySelector(".instructions");
  installInstr = document.querySelector(".installInstr");
  solved = document.querySelector(".solved");
  overlayed = document.querySelectorAll('.overlayed');

  function checkURL() {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("game")) {
      const gamestr = searchParams.get("game");
      if (/^[0-9]-[0-9]-[0-9]+-[0-9]+$/.test(gamestr)) {
        const opt = gamestr.split('-').map((e) => {return parseInt(e)});
        if (opt[0] >= g_int.l && opt[0] <= g_int.h
          && opt[1] >= r_int.l && opt[1] < r_int.h && opt[1] < opt[0]
          && opt[2] >= n_int.l && opt[2] <= n_int.h
          && opt[3] >= s_int.l && opt[3] <= s_int.h) {
            g = opt[0];
            r = opt[1];
            n = opt[2];
            s = opt[3];
          }
        
      }
    }
  }
  checkURL();
  
  function captureFrame() {
    // allow for screenshots at the end ???
    // https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture
  }

  function setMenuAndURL() {
    let gv = document.querySelector("#gv");
    gv.value = g;
    gv.min = g_int.l;
    gv.max = g_int.h;
    let rv = document.querySelector("#rv");
    rv.value = r;
    rv.min = r_int.l;
    rv.max = r_int.h;
    let nv = document.querySelector("#nv");
    nv.value = n;
    nv.min = n_int.l;
    nv.max = n_int.h;
    let sv = document.querySelector("#sv");
    sv.value = s;
    sv.min = s_int.l;
    sv.max = s_int.h;
    
    let start = document.querySelector("#start");
    start.innerHTML = game ? 'stop game' : 'start game'; 
    
    window.history.pushState({}, document.title, window.location.origin + window.location.pathname + `?game=${g}-${r}-${n}-${s}`);

    let stats = document.querySelector(".stats");
    stats.innerHTML = game ? moves + ' moves, ' + rots + ' rotations' : ''; 

    setBoard();
  }
  setMenuAndURL();

  function setBoard() {
    board.style.gridTemplateColumns = `repeat(${g}, 1fr)`;
    board.textContent = '';
    p_opt = [];
    for (let id = 0; id < g * g; ++id) {
      let item = document.createElement('div');
      item.classList.add('element');
      item.style.fontSize = `${18 / g}vw`;
      item.setAttribute("data-id", id);
      item.setAttribute("data-order", id);
      item.innerHTML = id + 1;
      board.appendChild(item);
      
      if ((id % g) < (g - (r - 1)) && Math.floor(id / g) < (g - (r - 1))) {
        p_opt.push(id);
      }
    }
    p = 0;
    drawMove();
  }
  
  function shuffleBoard(seed = 0, n = 50) {
    let p_saved = p;
    for (let i = 0; i < n; ++i) {
      var r1 = Math.floor(mulberry32(seed + i) * (p_opt.length + 1));
      var r2 = mulberry32(seed + i * 2);
      p = p_opt[r1];
      setMoveList();
      if (r2 < 0.5) rotate(true, false);
      else rotate(false, false);
    }
    p = p_saved;
    drawMove();
  }
  
  function setMoveList() {
    moveList = [];
    for (let b = p; b < p + r; ++b) moveList.push(b);
    for (let b = (p + r - 1) + g; b < (p + r - 1) + g * (r - 1); b += g) moveList.push(b);
    for (let b = (p + r - 1) + g * (r - 1); b >= p + g * (r - 1); --b) moveList.push(b);
    for (let b = p + g * (r - 2); b > p; b -= g) moveList.push(b);
  }

  function drawMove() {
    setMoveList();
    let items = board.children;
    for (const item of items) item.classList.remove('selected');
    moveList.forEach((idx) => items[idx].classList.add('selected'));

    let stats = document.querySelector(".stats");
    stats.innerHTML = game ? moves + ' moves, ' + rots + ' rotations' : ''; 
  }
  
  function moveLeft() {
    if (game && p % g > 0) {
      --p;
      ++moves;
      drawMove();
    }
  }

  function moveRight() {
    if (game && p % g < g - r) {
      ++p;
      ++moves;
      drawMove();
    }
  }

  function moveUp() {
    if (game && Math.floor(p / g) > 0) {
      p -= g;
      ++moves;
      drawMove();
    }
  }

  function moveDown() {
    if (game && Math.floor(p / g) < g - r) {
      p += g;
      ++moves;
      drawMove();
    }
  }

  function checkDone() {
    if (!game) return;
    let check = true;
    for (const item of board.children) {
      if (item.dataset.order != item.dataset.id) check = false;
    }
    if (check) {
      game = !game;
      // do some more when having solved the puzzle
      let solvedText = document.querySelector(".solvedText");
      solvedText.innerHTML = `<p>You have solved <strong>puzzle ${g}-${r}-${n}-${s}</strong> in ${moves} moves and <strong>${rots} rotations</strong>.</p>`
      solvedText.innerHTML += `<p class="small">To replay or share this particular puzzle, <span class="copy" onclick="navigator.clipboard.writeText(window.location.href)">click here</span> to copy the game link:<br/><span class="copy" onclick="navigator.clipboard.writeText(window.location.href)">${window.location.href}</span></p>`;

      overlayed.forEach(element => { element.style.display = 'none';});
      solved.style.display = 'flex';
      solved.style.gap = '1vw';
    }
  }

  function rotate(cw = true, animate = true) {
    ++rots;
    drawMove();
    let newList = JSON.parse(JSON.stringify(moveList));
    if (cw) {
      newList.push(newList[0]);
      newList.shift();
    } else {
      newList.unshift(newList[newList.length - 1]);
      newList.pop();
    }
    let children = board.children;
    for (let i = 0; i < moveList.length; ++i) {
      children[moveList[i]].dataset.order = newList[i];
      if (animate) {
        children[moveList[i]].classList.add('moved');
        setTimeout(() => {
          children[moveList[i]].classList.remove('moved');
        }, 25);
      }
    }
    const items = Array.from(children);
    items.sort((x,y) => {return x.dataset.order - y.dataset.order});
    items.forEach(item => board.appendChild(item));
    checkDone();
  }

  document.addEventListener('keydown', (event) => {
    // console.log('Key is down:', event.code);
    if (!game) return;
    switch (event.code) {
      case "ArrowLeft":
      case "KeyA":
        moveLeft();
        break;
      case "ArrowRight":
      case "KeyD":
        moveRight();
        break;
      case "ArrowUp":
      case "KeyW":
        moveUp();
        break;
      case "ArrowDown":
      case "KeyS":
        moveDown();
        break;
      case "Comma":
      case "KeyQ":
        rotate(false);
        break;
      case "Period":
      case "KeyE":
        rotate(true);
        break;
    }
  });
  
  board.addEventListener('touchstart', (event) => {
    event.preventDefault();
    touchstart.x = event.changedTouches[0].screenX;
    touchstart.y = event.changedTouches[0].screenY;
    let target = event.target;
    touchstart.rot = moveList.includes(parseInt(target.dataset.order));
    touchstart.col = target.dataset.order % g;
    touchstart.row = Math.floor(target.dataset.order / g);
  }, {passive: false});

  board.addEventListener('touchend', (event) => {
    touchend.x = event.changedTouches[0].screenX;
    touchend.y = event.changedTouches[0].screenY;
    let target = document.elementFromPoint(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
    touchend.rot = moveList.includes(parseInt(target.dataset.order));
    touchend.col = target.dataset.order % g;
    touchend.row = Math.floor(target.dataset.order / g);
    // event.preventDefault();
    checkTouch(event);
  }, {passive: false});

  // board.addEventListener('touchmove', (event) => {
  //   event.preventDefault();
  // }, {passive: false});

  // board.addEventListener('touchcancel', (event) => {
  //   event.preventDefault();
  // }, {passive: false});

  function checkTouch(event) {
    if (!game) return;
    let move_left_col = p % g;
    let move_right_col = move_left_col + r - 1;
    let move_top_row = Math.floor(p / g);
    let move_bottom_row = move_top_row + r - 1;

    if (touchstart.rot && touchend.rot) { // start and end touch in rotator » rotate
      if (touchstart.row == touchend.row) {
        if (touchend.row == move_top_row) {
          if (touchend.col < touchstart.col) rotate(false);
          else if (touchend.col > touchstart.col) rotate(true);
        } else if (touchend.row == move_bottom_row) {
          if (touchend.col < touchstart.col) rotate(true);
          else if (touchend.col > touchstart.col) rotate(false);
        }
      } else if (touchstart.col == touchend.col) {
        if (touchend.col == move_left_col) {
          if (touchend.row < touchstart.row) rotate(true);
          else if (touchend.row > touchstart.row) rotate(false);
        } else if (touchend.col == move_right_col) {
          if (touchend.row < touchstart.row) rotate(false);
          else if (touchend.row > touchstart.row) rotate(true);
        }
      }
    } else if (touchstart.rot && !touchend.rot) { // start in but end outside rotator » move
      if (touchend.col < touchstart.col) moveLeft();
      else if (touchend.col > touchstart.col) moveRight();
      if (touchend.row < touchstart.row) moveUp();
      else if (touchend.row > touchstart.row) moveDown();
    }

    // let threshold = parseInt(window.getComputedStyle(board.firstChild, null).height) * 0.75;
    // let deltaX = touchend.x - touchstart.x;
    // let deltaY = touchend.y - touchstart.y;
    // if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold && event.target.classList.contains('selected')) {
    //   if (touchend.col === move_left_col && touchend.row === move_top_row) rotate(false);
    //   if (touchend.col === move_right_col && touchend.row === move_top_row) rotate(true);
    //   return;
    // }
    // if (deltaX > threshold) moveRight();
    // if (-1 * deltaX > threshold) moveLeft();
    // if (deltaY > threshold) moveDown();
    // if (-1 * deltaY > threshold) moveUp();
  }
  
  let gm = document.querySelector("#gm");
  let gp = document.querySelector("#gp");
  
  document.querySelectorAll('.plusminus').forEach(element => {
    element.addEventListener('click', (event) => {
      if (game) return;
      switch (event.target.id) {
        case 'gm':
          if (g > g_int.l) --g;
          if (r >= g) --r;
          break;
        case 'gp':
          if (g < g_int.h) ++g;
          break;
        case 'rm':
          if (r > r_int.l) --r;
          break;
        case 'rp':
          if (r < g_int.h - 1) ++r;
          if (r >= g) ++g;
          break;
        case 'nm':
          if (n > n_int.l) --n;
          break;
        case 'np':
          if (n < n_int.h) ++n;
          break;
        case 'sm':
          if (s > s_int.l) --s;
          break;
        case 'sp':
          if (s < s_int.h) ++s;
          break;
      }
      setMenuAndURL();
    });
  });

  document.querySelector('.seed').addEventListener('click', (event) => {
    s = Math.floor(Math.random() * (s_int.h - s_int.l + 1)) + s_int.l;
    setMenuAndURL();
  });

  document.querySelector('.start').addEventListener('click', (event) => {
    game = !game;
    if (game) {
      setMenuAndURL();
      shuffleBoard(s, n);
      moves = 0;
      rots = 0;
      drawMove();
    } else {
      setMenuAndURL();
    }
  });
  
  document.querySelector('.boardurl').addEventListener('click', (event) => {
    navigator.clipboard.writeText(window.location.href);
    let save = event.target.innerHTML;
    event.target.innerHTML = "board URL copied";
    event.target.style.fontWeight = "bold";
    setTimeout(() => {
      event.target.innerHTML = save;
      event.target.style.fontWeight = "";
    }, 1000);
  });

  document.querySelector('.openInstructions').addEventListener('click', (event) => {
    overlayed.forEach(element => { element.style.display = 'none';});
    instructions.style.display = 'flex';
  });

  document.querySelector('.closeInstructions').addEventListener('click', (event) => {
    overlayed.forEach(element => { element.style.display = 'none';});
    menu.style.display = 'flex';
  });

  document.querySelector('.closeSolved').addEventListener('click', (event) => {
    setMenuAndURL();
    overlayed.forEach(element => { element.style.display = 'none';});
    menu.style.display = 'flex';
  });

  document.querySelector('.title').addEventListener('click', (event) => {
    if (game) return;
    g = 3;
    r = 2;
    n = 50;
    s = 0;
    setMenuAndURL();
  });
  
  // window.addEventListener('beforeinstallprompt', (e) => {
  //   e.preventDefault();
  //   deferredPrompt = e;
  //   console.log('showInstallButton');
  //   // showInstallButton();
  // });

  // document.querySelector('.install').addEventListener('click', async () => {
  //   if (!deferredPrompt) return;
  //   deferredPrompt.prompt();
  //   const { outcome } = await deferredPrompt.userChoice;
  //   console.log(`User response: ${outcome}`);
  //   deferredPrompt = null;
  //   if (outcome === 'accepted') {
  //     console.log('User accepted the install prompt.');
  //   } else if (outcome === 'dismissed') {
  //     console.log('User dismissed the install prompt');
  //   }
  // });

};

