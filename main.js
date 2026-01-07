import { HTMLElement } from './htmlelement.js';
import { Picker, PickerState } from './picker.js';

const version = '4.0.0-alpha';

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

let sortable = [];
let dragging = false;

let timer;

let json;
let items;
let listId;

window.onload = function() {
    const params = new URLSearchParams(window.location.search);
    const listParam = params.get('l');
    if (listParam) {
        fetch(`lists/${listParam}.json`, { cache: 'no-store' }).then(response => {
		    if (!response.ok) {
			    throw new Error('Failed to load JSON file');
		    }
		    return response.json();
	    }).then(data => {
            listId = listParam;
            json = data;
            appendNewCSS(listId);
            initApp();
        }).catch(error => {
		    console.error('Error fetching JSON:', error);
	    });
    }

    document.getElementById('file-input').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                listId = file.name.substring(0, file.name.lastIndexOf('.'));
                appendNewCSS(listId);
                json = JSON.parse(e.target.result);
                initApp();
            } catch (error) {
                alert('Invalid JSON file.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    });

    const burger = document.getElementById('burger');
    const burgerMenu = document.getElementById('burger-menu');
    burger.addEventListener('click', () => {
        burgerMenu.classList.toggle('burger-menu-expanded');
    });
    document.getElementById('reset').addEventListener('click', () => {
        deleteCache();
    });
    document.getElementById('share').addEventListener('click', () => {
        let shareCode = generateShareCode();
        const url = new URL(window.location.href);
        url.searchParams.delete('s');
        url.searchParams.append('s', shareCode);
        document.getElementById('share-url').innerText = url.toString();
        document.getElementById('share-modal-wrapper').style.display = 'block';
    });
    document.getElementById('share-modal-close').addEventListener('click', () => {
        document.getElementById('share-modal-wrapper').style.display = 'none';
    });
    document.getElementById('share-modal-wrapper').addEventListener('click', () => {
        document.getElementById('share-modal-wrapper').style.display = 'none';
    });
    const shareUrlSpan = document.getElementById('share-url');
    document.getElementById('copy-button').onclick = function() {
	    navigator.clipboard.writeText(shareUrlSpan.textContent).then(() => {
		    const copyMessage = document.getElementById('copy-message');
		    copyMessage.style.display = 'block';
		    copyMessage.style.opacity = 1;
		    setTimeout(function() {
			    copyMessage.style.opacity = 0; 
		    }, 1000);
		    setTimeout(function() {
			    copyMessage.style.display = 'none';
		    }, 2000);
	    }, error => {
		    console.error('Failed to copy: ', error);
	    });
    }
    document.getElementById('preview-mode-blocker').addEventListener('click', () => {
        document.getElementById('preview-mode-modal-wrapper').style.display = 'block';
    });
    document.getElementById('preview-mode-modal-close').addEventListener('click', () => {
        document.getElementById('preview-mode-modal-wrapper').style.display = 'hidden';
    });
    document.getElementById('close-button').addEventListener('click', () => {
        document.getElementById('preview-mode-modal-wrapper').style.display = 'hidden';
    });
    document.getElementById('edit-button').addEventListener('click', () => {
        saveTierList();
        const url = new URL(window.location.href);
        url.searchParams.delete('s');
        window.location.href = url.toString();
    });
    document.getElementById('new-button').addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('s');
        window.location.href = url.toString();
    });
}

function initApp() {
    console.log('Loaded JSON:', json);
    try {
        switch(json.type) {
            case 'tierlist':
                initTierList();
                break;
            case 'ranking':
                initPicker();
                break;
            default:
                throw new Error('Invalid ranking type: ' + json.type);
        }
    } catch (err) {
        console.error('Failed setup.', err);
    }
}

function handleHoverOverExpandedPreview(event) {
    if (dragging) {
        return;
    }

    timer = setTimeout(() => {
        let img = new Image();
        img.addEventListener("load", () => {
            const preview = document.getElementById('preview-container');
            const rect = preview.getBoundingClientRect();
            const overflowRight = rect.right > document.documentElement.clientWidth;
            const OverflowLeft = rect.left < 0;
            const overflowTop = rect.top < 0;
            const itemRect = event.target.getBoundingClientRect();
            if (OverflowLeft) {
                preview.style.left = -itemRect.left + 5;
                preview.style.right = 'auto';
                preview.style.transform = 'none';
            } else if (overflowRight) {
                preview.style.left = 'auto';
                preview.style.right = itemRect.right - document.documentElement.clientWidth + 5;
                preview.style.transform = 'none';
            }
            if (overflowTop) {
                preview.style.top = 'calc(100% + 5px)';
                preview.style.bottom = 'auto';
            }
        });
        let item = getItemByID(event.target.id.slice(5));
        if (item.hasOwnProperty('previewImagePath')) {
            img.src = `images/${listId}/${item.previewImagePath}`;
        } else {
            img.src = `images/${listId}/${item.imagePath}`;
        }
        document.querySelector('#preview-container img').src = img.src;
        event.target.appendChild(document.getElementById('preview-container'));
    }, 600);
}

function discardHover() {
    const preview = document.getElementById('preview-container');
    preview.style.left = '';
    preview.style.right = '';
    preview.style.transform = '';
    preview.style.top = '';
    preview.style.bottom = '';
    document.getElementById('preview-wrapper-hidden').appendChild(preview);
}

function assignIds(jsonData) {
    const options = json.options;

    // Collect existing ids
    const usedIds = new Set();
    options.forEach(opt => {
        if (Number.isInteger(opt.id) && opt.id > 0) {
            usedIds.add(opt.id);
        }
    });

    // Find items missing id and attach offset (default 0)
    const missingIdItems = [];
    options.forEach((opt, idx) => {
        if (!Number.isInteger(opt.id) || opt.id <= 0) {
            missingIdItems.push({
                option: opt,
                offset: Number.isInteger(opt.autoIdPriorityOffset) ? opt.autoIdPriorityOffset : 0,
                originalIndex: idx
            });
        }
    });

    // Sort by offset first, then original JSON order
    missingIdItems.sort((a, b) => {
        if (a.offset !== b.offset) {
            return a.offset - b.offset;
        }
        return a.originalIndex - b.originalIndex;
    });

    // Start assigning next available ids starting from 1
    let nextId = 1;
    const assignNextId = () => {
        while (usedIds.has(nextId)) {
            nextId++;
        }
        const assigned = nextId;
        usedIds.add(assigned);
        nextId++;
        return assigned;
    };

    // Assign ids to missing-id items
    missingIdItems.forEach(item => {
        item.option.id = assignNextId();
    });

    // Return options in original order (they have new ids now)
    return options;
}

// This can throw 404 errors. That is fine. We can fix that by creating an empty css file for every list.
function appendNewCSS(css) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/css/${css}.css`;
    document.head.appendChild(link);
}

function getItemByID(id) {
    for (const i of items) {
        if (i.id == id) {
            return i;
        }
    }
    return null;
}

// **********************************************************************************************
// Tier list code
// **********************************************************************************************

const options = {
    group: 'tiers',
    animation: 150,
    draggable: '.item',
    multiDrag: true,
    selectedClass: 'selected',
    onStart: function(event) {
        dragging = true;
        discardHover();
    },
    onEnd: function () {
        updateOverflowFlags(); // recheck overflow when drag finishes
        dragging = false;
        saveTierList();
    }
};

function initTierList() {
    // Hide file selector
    document.getElementById('file-input').style = 'visibility: hidden';
    // Set header information
    document.getElementById('app-header').style = 'visibility: visible';
    document.getElementById('version-info').innerText = `version: ${json.listVersion} ${document.querySelector('meta[name="version"]').content} ${version} ${getComputedStyle(document.documentElement).getPropertyValue('--version')}`;
    document.getElementById('title').innerText = json.title;
    if (json.hasOwnProperty('subtitle')) {
        document.getElementById('subtitle').innerText = json.subtitle;
    }
    // Verify item IDs and generate as needed
    items = assignIds();
    // Generate the rows and items
    const tierListContainer = new HTMLElement('div').class('tierlist-container').appendAsChild(document.getElementById('app-body'));
    const tierListRows = tierListContainer.createChildElement('div').class('tiers');
    for (const rank of json.ranks) {
        const tierListRow = tierListRows.createChildElement('div').class('tier');
        const title = tierListRow.createChildElement('h2').innerHTML(rank.text).style(`background-color:${rank.color}`);
        const collapseButton = tierListRow.createChildElement('button').class('toggle tier-toggle');
        const collapseButtonCarrot = collapseButton.createChildElement('i').class('fa-solid fa-caret-down');
        const itemWrapper = tierListRow.createChildElement('div').class('item-wrapper');
    }
    const bankContainer = tierListContainer.createChildElement('div').class('bank');
    const bankRow = bankContainer.createChildElement('div').class('tier');
    const itemWrapper = bankRow.createChildElement('div').class('item-wrapper');
    for (const item of items) {
        const itemDiv = itemWrapper.createChildElement('div').class('item').id(`item-${item.id}`);
        const itemImg = itemDiv.createChildElement('img').attribute('src', "images/" + listId + "/" + item.imagePath);
        itemImg.get.onerror = function() {
            img.src = 'images/placeholder.jpg'
        }
        if (json.hasOwnProperty('enableOptionText') && json.enableOptionText) {
            if (item.hasOwnProperty('imageText')) {
                const itemText = itemDiv.createChildElement('span').innerHTML(item.imageText);
            } else {
                const itemText = itemDiv.createChildElement('span').innerHTML(item.imagePath.substring(0, item.imagePath.lastIndexOf('.')));
            }
        }
    }
    const bankButton = bankRow.createChildElement('button').class('toggle bank-toggle');
    const bankButtonCarrot = bankButton.createChildElement('i').class('fa-solid fa-table-columns');   
    // Initialize Sortable and other buttons
    let rows = document.querySelectorAll('.item-wrapper');
    for (const row of rows) {
        let sort = new Sortable(row, options);
        sortable.push(sort);
    }
    let toggles = document.querySelectorAll('.tier-toggle');
    for (const toggle of toggles) {
        toggle.addEventListener('click', function (e) {
            const tier = e.target.closest('.tier');
            tier.classList.toggle('collapsed');
            updateOverflowFlags();
        });
    }
    document.querySelector('.bank-toggle').addEventListener('click', function(e) {
        const wrapper = document.querySelector('.tierlist-container');
        wrapper.classList.toggle('alt-bank-position');
        updateOverflowFlags();
    });
    let itemElements = document.querySelectorAll('.item');
    for (const item of itemElements) {
        item.addEventListener('mouseenter', (event) => {
			handleHoverOverExpandedPreview(event);
		});
        item.addEventListener('mouseleave', (event) => {
			clearTimeout(timer);
            discardHover();
		});
    }
    // Force update the overflow flags just incase
    loadTierList();
    updateOverflowFlags();
}

function updateOverflowFlags() {
    document.querySelectorAll('.tier.collapsed').forEach(tier => {
        const wrapper = tier.querySelector('.item-wrapper');
        const isOverflowing = wrapper.scrollHeight > wrapper.offsetHeight;
        tier.classList.toggle('is-overflowing', isOverflowing);
    });
}

function saveTierList() {
    const saveData = {};
    saveData.data = [];
    let rows = document.querySelectorAll('.item-wrapper');
    for (let i = 0; i < rows.length - 1; i++) {
        let idList = [];
        let items = rows[i].querySelectorAll('.item');
        for (const item of items) {
            idList.push(item.id.slice(5));
        }
        saveData.data.push(idList);
    }
    localStorage.setItem(listId, JSON.stringify(saveData));
    generateShareCode();
}

function loadTierList() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('s')) {
        document.getElementById('preview-mode-wrapper').style.display = 'block';
        // Load from a url string
        let code = params.get('s');
        let ids = decodeIntsFromB64Url(code);
        let rows = document.querySelectorAll('.item-wrapper');
        let rowIndex = 0;
        for (let i = 0; i < ids.length; i++) {
            if (rowIndex >= rows.length) {
                break;
            }
            if (ids[i] == 0) {
                rowIndex++;
                continue;
            }
            const item = rows[rows.length - 1].querySelector(`#item-${ids[i]}`);
            rows[rowIndex].appendChild(item);
        }

    } else if (localStorage.getItem(listId) !== null) {
        // Load from the cache
        let rows = document.querySelectorAll('.item-wrapper');
        let saveData = JSON.parse(localStorage.getItem(listId));
        for (let i = 0; i < rows.length - 1; i++) {
            for (const id of saveData.data[i]) {
                const item = rows[rows.length - 1].querySelector(`#item-${id}`);
                rows[i].appendChild(item);
            }
        }
    }
}

function deleteCache() {
    if (localStorage.getItem(listId) !== null) {
        localStorage.removeItem(listId);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    window.location.href = url.toString();
}

function generateShareCode() {
    const ids = [];
    let rows = document.querySelectorAll('.item-wrapper');
    for (let i = 0; i < rows.length - 1; i++) {
        let items = rows[i].querySelectorAll('.item');
        for (const item of items) {
            ids.push(item.id.slice(5));
        }
        ids.push(0);
    }
    return encodeIntsToB64Url(ids);

}

function encodeIntsToB64Url(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return "";
    }

    const ints = values.map(v => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0) {
            throw new Error("All values must be positive integers or numeric strings");
        }
        return n;
    });

    let max = Math.max(...ints);
    let bits = 0, t = max;
    while (t > 0) { 
        bits++; t >>= 1;
    }
    if (bits > 63) {
        throw new Error("bit-width too large to store in 6 bits");
    }

    const toBits = (v, w) => v.toString(2).padStart(w, "0");
    let bin = toBits(bits, 6);
    for (const n of ints) {
        bin += toBits(n, bits);
    }

    const pad = (6 - (bin.length % 6)) % 6;
    if (pad) {
        bin += "0".repeat(pad);
    }

    let out = "";
    for (let i = 0; i < bin.length; i += 6) {
        out += alphabet[parseInt(bin.slice(i, i + 6), 2)];
    }
    return out;
}

function decodeIntsFromB64Url(encoded) {
    let bin = "";
    for (const ch of encoded) {
        const idx = alphabet.indexOf(ch);
        if (idx === -1) {
            throw new Error("Invalid character");
        }
        bin += idx.toString(2).padStart(6, "0");
    }

    const bits = parseInt(bin.slice(0, 6), 2);

    const result = [];
    for (let i = 6; i + bits <= bin.length; i += bits) {
        result.push(parseInt(bin.slice(i, i + bits), 2));
    }

    return result;
}

// **********************************************************************************************
// Ranking code
// **********************************************************************************************

let pickerOptionContainer;
let pickerRemainingUntilFavoriteNumber;
let pickerProgressBar;
let pickerFavoritesContainer;
let picker;

function initPicker() {
    // Hide file selector
    document.getElementById('file-input').style = 'visibility: hidden';
    // Set header information
    document.getElementById('app-header').style = 'visibility: visible';
    document.getElementById('version-info').innerText = `version: ${json.listVersion} ${document.querySelector('meta[name="version"]').content} ${version} ${getComputedStyle(document.documentElement).getPropertyValue('--version')}`;
    document.getElementById('title').innerText = json.title;
    if (json.hasOwnProperty('subtitle')) {
        document.getElementById('subtitle').innerText = json.subtitle;
    }
    // Verify item IDs and generate as needed
    items = assignIds();
    // Initialize the picker code
    picker = new Picker(json.options);
    
    // Generate picker UI
    const pickerContainer = new HTMLElement('div').class('picker-container').appendAsChild(document.getElementById('app-body'));
    const pickerOptionColumn = pickerContainer.createChildElement('div').class('picker-option-column');
    const pickerOptionWrapper = pickerOptionColumn.createChildElement('div').class('picker-option-wrapper');
    pickerOptionContainer = pickerOptionWrapper.createChildElement('ul').class('picker-option-container');
    const pickerButtonWrapper = pickerOptionWrapper.createChildElement('div').class('picker-info-wrapper');
    const pickerButtonPick = pickerButtonWrapper.createChildElement('button').class('picker-button').id('picker-button-pick').innerHTML('Pick');
    pickerButtonPick.get().addEventListener('click', (event) => {
        picker.pick();
        updatePickerUI();
    });
    const pickerButtonPass = pickerButtonWrapper.createChildElement('button').class('picker-button').id('picker-button-pass').innerHTML('Pass');
    pickerButtonPass.get().addEventListener('click', (event) => {
        picker.pass();
        updatePickerUI();
    });
    const pickerButtonUndo = pickerButtonWrapper.createChildElement('button').class('picker-button').id('picker-button-undo').innerHTML('Undo');
    const pickerButtonRedo = pickerButtonWrapper.createChildElement('button').class('picker-button').id('picker-button-redo').innerHTML('Redo');
    const pickerRemainingUntilFavorite = pickerOptionWrapper.createChildElement('p').class('picker-info-text').innerHTML('Remining to be eliminated until next favorite is found: ');
    pickerRemainingUntilFavoriteNumber = pickerRemainingUntilFavorite.createChildElement('span').id("remining").innerHTML('null');
    const pickerProgressText = pickerOptionWrapper.createChildElement('p').class('picker-info-text').innerHTML('Progress towards next favorite:');
    pickerProgressBar = pickerOptionWrapper.createChildElement('progress').id('progress').attribute('max', '100').attribute('value', '70');

    const pickerFavoriteColumn = pickerContainer.createChildElement('div').class('picker-favorite-column');
    const pickerFavoriteWrapper = pickerFavoriteColumn.createChildElement('div').class('picker-option-wrapper picker-favorites');
    const pickerFavoriteHeader = pickerFavoriteWrapper.createChildElement('h3').class('picker-favorites-header').innerHTML('Found Favorites');
    pickerFavoritesContainer = pickerFavoriteWrapper.createChildElement('ul').class('picker-option-container picker-favorites');

    updatePickerUI();
}

function displayPickerBatch() {
    const curItems = picker.getCurrentBatch();
    pickerOptionContainer.innerHTML('');
    for (let item of curItems) {
        const pickerOption = pickerOptionContainer.createChildElement('li').class('picker-option').id(item.id);
        pickerOption.get().addEventListener('click', (event) => {
            event.preventDefault();
            event.currentTarget.classList.toggle('selected');
        });
        pickerOption.get().addEventListener('mouseenter', (event) => {
			handleHoverOverExpandedPreview(event);
		});
        pickerOption.get().addEventListener('mouseleave', (event) => {
			clearTimeout(timer);
            discardHover();
		});
        const pickerOptionImg = pickerOption.createChildElement('img').class('picker-option-img').attribute('src', "images/" + id + "/" + item.imagePath).attribute('draggable', false);
    }
}

function displayPickerFavorites() {
    const favorites = picker.getFavorites();
    // TODO: check if a favorite is already present so we dont need to re-draw it
    pickerFavoritesContainer.innerHTML('');
    for (const fav of favorites) {
        const pickerFav = pickerFavoritesContainer.createChildElement('li').class('picker-option').id(fav.id);
        const pickerOptionImg = pickerFav.createChildElement('img').class('picker-option-img').attribute('src', "images/" + id + "/" + fav.imagePath);
    }
}

function updatePickerUI() {
    // TODO: check if we even need to redraw any of these
    displayPickerBatch();
    pickerRemainingUntilFavoriteNumber.innerHTML(picker.getRemainingToEliminate());
    pickerProgressBar.attribute('value', picker.getRemainingToEliminatePercent());
    displayPickerFavorites();
}