const version = "3.0.0-ALPHA";

let dragContainerRef;

let grids = [];

var dragging = false;

let timer;
let listData;

window.onload = function() {
	const url = new URL(window.location.href);
	if(url.searchParams.has('l')) {
		fetchJson(url.searchParams.get('l'));
		const modal = document.getElementById('popupModal');
		const shareButton = document.getElementById('shareButton');
		const closePopupBtn = document.getElementById('closePopup');
		const currentUrlSpan = document.getElementById('currentUrl');
		shareButton.onclick = function() {
			const url = new URL(window.location.href);
			url.searchParams.delete('s');
			url.searchParams.append('s', '' + getShareGridStateCode());
			currentUrlSpan.textContent = url.toString();
			modal.style.display = 'flex';
		}
		closePopupBtn.onclick = function() {
			modal.style.display = 'none';
		}
		copyBtn.onclick = function() {
			navigator.clipboard.writeText(currentUrlSpan.textContent).then(() => {
				const copyMessage = document.getElementById('copyMessage');
				copyMessage.style.display = 'block';
				copyMessage.style.opacity = 1;
				setTimeout(function() {
					copyMessage.style.opacity = 0; 
				}, 1000);
				setTimeout(function() {
					copyMessage.style.display = 'none';
				}, 2000);
			}, err => {
				console.error('Failed to copy: ', err);
			});
		}
		// Close the modal when clicking outside the content
		window.onclick = function(event) {
			if (event.target === modal) {
				modal.style.display = 'none';
			}
		}
		// For some reason long lists may render wong, this shortcut should fix it
		document.addEventListener('keydown', function(event) {
			if (event.altKey && event.key.toLowerCase() === 's') {
				for (const grid of grids) {
					grid.refreshItems().layout();
				}
				event.preventDefault();
			}
		});
	} else {
		console.log('No list parameter specified!')
	}
}

function fetchJson(list) {
	fetch(`lists/${list}.json`, { cache: 'no-store' }).then(response => {
		if (!response.ok) {
			throw new Error('Failed to load JSON file');
		}
		return response.json();
	}).then(data => {
		listData = data;
		dragContainerRef = document.querySelector('.drag-container');
		// Update document
		document.title = listData.title;
		document.querySelector('h1.title').innerHTML = listData.title;
		document.querySelector('h6.title').innerHTML = listData.subtitle;
		document.querySelector('.version span').innerHTML = `Script Version: ${version}&nbsp;&nbsp;&nbsp;List Version: ${listData.listVersion}`;
		// Load grids
		buildGrids();
		
		loadGridState();
	}).catch(error => {
		console.error('Error fetching JSON:', error);
	});
}

function buildGrids() {
	const ranksDiv = document.getElementById('ranks');
	let id = 1;
	for (const element of listData.ranks) {
		const boardColumnDiv = document.createElement('div');
		boardColumnDiv.className = 'board-column';
		boardColumnDiv.id = `rank-${id}`;
		
		const headerDiv = document.createElement('div');
		headerDiv.className = 'board-column-header';
		headerDiv.textContent = element.text;
		if (element.hasOwnProperty('style')) {
			headerDiv.style = `background:${element.color};${element.style}`;
		} else {
			headerDiv.style = `background:${element.color};`;
		}
		
		const contentDiv = document.createElement('div');
		contentDiv.className = 'board-column-content';
		
		boardColumnDiv.appendChild(headerDiv);
		boardColumnDiv.appendChild(contentDiv);
		
		ranksDiv.appendChild(boardColumnDiv);
		
		grids.push(initGrid(`#rank-${id} .board-column-content`));
		id++;
	}
	const optionsDiv = document.getElementById('itemBank');
	for (const element of listData.options) {
		const boardItemDiv = document.createElement('div');
		boardItemDiv.className = 'board-item';
		boardItemDiv.setAttribute('data-id', element.id);
		
		const boardItemContentDiv = document.createElement('div');
		boardItemContentDiv.className = 'board-item-content';
		
		const boardItemImage = document.createElement('img');
		boardItemImage.src = listData.imagesRoot + element.imagePath;
		
		const boardItemText = document.createElement('p');
		boardItemText.className = 'name';
		if (listData.enableImageText && element.hasOwnProperty('imageText')) {
			boardItemText.textContent = element.imageText;
		}
		
		if (listData.hasOwnProperty('disableItemBackground') && listData.disableItemBackground === true) {
			boardItemDiv.style = 'min-width:50px;background:#00000000;';
			boardItemContentDiv.style = 'background:#00000000;';
			boardItemImage.style = 'padding:0px;max-height:100px;';
		}
		
		boardItemDiv.addEventListener('mouseenter', (event) => {
			handleHoverOverPreview(event);
		});
		boardItemDiv.addEventListener('mouseleave', (event) => {
			clearTimeout(timer);
			discardHover();
		});
		
		boardItemDiv.appendChild(boardItemContentDiv);
		boardItemContentDiv.appendChild(boardItemImage);
		boardItemContentDiv.appendChild(boardItemText);
		
		optionsDiv.appendChild(boardItemDiv);
	}
	document.querySelector('.bank').style.visibility = 'visible';
	grids.push(initGrid(".bank .board-column-content"));
	for (const grid of grids) {
		grid.refreshItems().layout();
	}
}

function initGrid(gridId) {
	let grid = new Muuri(gridId, {
		items: '.board-item',
		layoutOnInit: false,
		dragEnabled: true,
		dragContainer: dragContainerRef,
		dragSort: function () {
			return grids;
		}
	}).on('dragInit', function (item, event) {
		dragging = true;
		clearTimeout(timer);
		discardHover();
	}).on('dragEnd', function (item, event) {
		dragging = false;
		saveGridState();
	});
	return grid;
}

function getShareGridStateCode() {
	const encoder = new Encoder();
	grids.slice(0, -1).forEach(element => {
		const options = element.getItems().map(item => item.getElement().getAttribute('data-id'));
		for (const option of options) {
			encoder.add(option);
		}
		encoder.addPadding();
	});
	return encoder.toBase64();
}

function saveGridState() {
	const url = new URL(window.location.href);
	for (let i = 0; i < grids.length; i++) {
		const gridState = grids[i].getItems().map(item => item.getElement().getAttribute('data-id'));
		localStorage.setItem(url.searchParams.get('l') + i, JSON.stringify(gridState));
	}
}

function loadGridState() {
	const url = new URL(window.location.href);
	if(url.searchParams.has('s')) {
		sharedSave = url.searchParams.get('s');
		new Encoder().fromBase64(sharedSave);
		for (let grid of grids) {
			grid.refreshItems().layout();
		}
		const modal = document.getElementById('blockingModal');
		const modalBox = document.getElementById('editModal');
		const closePopupBtn = document.getElementById('closeReadOnlyPopup');
		const confirmBtn = document.getElementById('confirmBtn');
		const denyBtn = document.getElementById('denyBtn');
		modal.style.display = 'flex';
		modal.onclick = function(event) {
			if (event.target === modal) {
				modalBox.style.display = 'block';
			}
		}
		closePopupBtn.onclick = function() {
			modalBox.style.display = 'none';
		}
		denyBtn.onclick = function() {
			modalBox.style.display = 'none';
		}
		confirmBtn.onclick = function() {
			modal.style.display = 'none';
		}
	} else {
		loadGridStateFromCache();
	}
}

function loadGridStateFromCache() {
	let i = 0;
	const url = new URL(window.location.href);
	while (true) {
		let json = localStorage.getItem(url.searchParams.get('l') + i);
		if (json !== null) {
			const gridState = JSON.parse(json);
			for (const element of gridState) {
				sendOptionToGrid(element, i);
			}
			i++;
		} else {
			return;
		}
	}
}

function clearCache() {
	let i = 0;
	const url = new URL(window.location.href);
	while (true) {
		let json = localStorage.getItem(url.searchParams.get('l') + i);
		if (json !== null) {
			localStorage.removeItem(url.searchParams.get('l') + i);
		} else {
			break;
		}
	}
	location.reload();
}

function sendOptionToGrid(opt, grid) {
	const bank = grids[grids.length - 1];
	const element = document.querySelector(`[data-id="${opt}"]`);
	bank.send(element, grids[grid], -1);
}

function discardHover() {
	document.querySelector('.preview-container').style.visibility = 'hidden';
}

function Encoder() {
	const base64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
	
	this.encodedInts = [];
	
	this.add = function(num) {
		this.encodedInts.push((num >> 6) + 0b100000);
		this.encodedInts.push(num & 0b111111);
	}
	
	this.addPadding = function() {
		this.encodedInts.push(0);
	}
	
	this.toBase64 = function() {
		let result = '';
		for(const num of this.encodedInts) {
			result += base64chars[num];
		}
		return result;
	}
	
	this.fromBase64 = function(code) {
		let codedString = code.split('');
		let currentGrid = 0;
		for (let i = 0; i < codedString.length; i++) {
			let c = base64chars.indexOf(codedString[i]);
			if (c == 0) {
				currentGrid++;
			} else {
				let num = c - 0b100000;
				num = num << 6;
				num += base64chars.indexOf(codedString[i + 1]);
				i++
				sendOptionToGrid(num, currentGrid);
			}
		}
	}
}

function handleHoverOverPreview(event) {
	if (!listData.enablePreview) {
		return;
	}
	if (!dragging) {
		timer = setTimeout(() => {
			const id = event.target.getAttribute('data-id');
			let item = listData.options.find(option => option.id == id);
			item = item ? item : null; // Ensure it is null if not found!
			
			let img = new Image();
			
			if (item !== null && item.hasOwnProperty('previewImagePath')) {
				img.src = listData.imagesRoot + item.previewImagePath;
			} else {
				img.src = event.target.querySelector('img').src;
			}
			
			let width = img.width;
			let height = img.height;
			
			if ((listData.previewImageMinWidth !== -1 && listData.previewImageMinHeight !== -1) &&
					(width < listData.previewImageMinWidth || height < listData.previewImageMinHeight)) {
				// We need to scale the image up
				// Image needs to be scaled so either both of its dimensions are greater than the min OR until
				// one of its dimensions reaches the max, whichever happens first
				// It is possible we overscale, in which case the next if statement will catch it.
				let scaleWidth = listData.previewImageMinWidth / width;
				let scaleHeight = listData.previewImageMinHeight / height;
				let scale = Math.max(scaleWidth, scaleHeight);
				width *= scale;
				height *= scale;
			}
			if (width > listData.previewImageMaxWidth || height > listData.previewImageMaxHeight) {
				// We need to scale the image down
				let scaleWidth = listData.previewImageMaxWidth / width;
				let scaleHeight = listData.previewImageMaxHeight / height;
				let scale = Math.min(scaleWidth, scaleHeight);
				width *= scale;
				height *= scale;
			}
			
			let rec = event.target.getBoundingClientRect();
			let scrollOffset = window.pageYOffset || document.documentElement.scrollTop;
			let x = (rec.left + (rec.width / 2)) - (width / 2);
			let y = rec.top - height - 16 + scrollOffset; // subtract 16 to give us space and account for borders
			
			if (listData.enablePreviewText) {
				let text;
				if (item !== null && item.hasOwnProperty('imageText')) {
					text = item.imageText;
				} else {
					text = formatName(item.imagePath);
				}
				document.querySelector('.preview-container p').style.display = 'block';
				document.querySelector('.preview-container p').innerHTML = text;
				y -= 26;
			}
			
			
			if (x < 8) {
				x = 8;
			}
			if (document.documentElement.clientWidth - x - width < 8) {
				x = document.documentElement.clientWidth - width - 14;
			}
			
			let viewHeight = window.innerHeight;
			let oldY = y;
			
			if (y < 8 + scrollOffset) {
				y = rec.bottom + window.scrollY + 10;
			}
			// If the image would be cut off on the top AND bottom, prefer to cut off on the top of the screen
			if (y + height + 16 > viewHeight + scrollOffset) {
				y = oldY;
			}
			
			document.querySelector('.preview-container img').src = img.src;
			document.querySelector('.preview-container img').style.height = `${height}px`;
			document.querySelector('.preview-container img').style.width = `${width}px`;
			document.querySelector('.preview-container').style.top = `${y}px`;
			document.querySelector('.preview-container').style.left = `${x}px`
			document.querySelector('.preview-container').style.visibility = 'visible';
		}, 600);
	}
}

function formatName(fileName) {
	// Step 1: Remove the file extension
	let nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
	// Step 2: Replace underscores with spaces
	let nameWithSpaces = nameWithoutExtension.replace(/_/g, " ");
	// Step 3: Capitalize the first letter of each word
	let formattedName = nameWithSpaces.replace(/\b\w/g, function(char) {
		return char.toUpperCase();
	});
	return formattedName;
}