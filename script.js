var type = document.querySelector('h1').getAttribute('id');
var timer;

var dragging = false;

var dragContainer = document.querySelector('.drag-container');
var columnGrids = [];

var gridS = initGrid(".rank-s .board-column-content");
var gridA = initGrid(".rank-a .board-column-content");
var gridB = initGrid(".rank-b .board-column-content");
var gridC = initGrid(".rank-c .board-column-content");
var gridD = initGrid(".rank-d .board-column-content");
var gridF = initGrid(".rank-f .board-column-content");
var gridU = initGrid(".rank-u .board-column-content");
var gridBank = initGrid(".bank .board-column-content");

document.querySelector('#scriptVersion').innerHTML = "Script version: 1.3.0";

function initGrid(gridId) {
	var grid = new Muuri(gridId, {
		items: '.board-item',
		layoutOnInit: false,
		dragEnabled: true,
		dragContainer: dragContainer,
		dragSort: function () {
			return [gridS, gridA, gridB, gridC, gridD, gridF, gridU, gridBank]
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

// When all items have loaded refresh their
// dimensions and layout the grid.
window.addEventListener('load', function () {
	loadGridState();
	gridS.refreshItems().layout();
	gridA.refreshItems().layout();
	gridB.refreshItems().layout();
	gridC.refreshItems().layout();
	gridD.refreshItems().layout();
	gridF.refreshItems().layout();
	gridU.refreshItems().layout();
	gridBank.refreshItems().layout();
});

function saveGridState() {
	const gridSState = gridS.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridAState = gridA.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridBState = gridB.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridCState = gridC.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridDState = gridD.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridFState = gridF.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridUState = gridU.getItems().map(item => item.getElement().getAttribute('data-id'));
	const gridBankState = gridBank.getItems().map(item => item.getElement().getAttribute('data-id'));

	localStorage.setItem(type + 'gridSState', JSON.stringify(gridSState));
	localStorage.setItem(type + 'gridAState', JSON.stringify(gridAState));
	localStorage.setItem(type + 'gridBState', JSON.stringify(gridBState));
	localStorage.setItem(type + 'gridCState', JSON.stringify(gridCState));
	localStorage.setItem(type + 'gridDState', JSON.stringify(gridDState));
	localStorage.setItem(type + 'gridFState', JSON.stringify(gridFState));
	localStorage.setItem(type + 'gridUState', JSON.stringify(gridUState));
	localStorage.setItem(type + 'gridBankState', JSON.stringify(gridBankState));
}

function loadGridState() {
	const gridSState = JSON.parse(localStorage.getItem(type + 'gridSState'));
	const gridAState = JSON.parse(localStorage.getItem(type + 'gridAState'));
	const gridBState = JSON.parse(localStorage.getItem(type + 'gridBState'));
	const gridCState = JSON.parse(localStorage.getItem(type + 'gridCState'));
	const gridDState = JSON.parse(localStorage.getItem(type + 'gridDState'));
	const gridFState = JSON.parse(localStorage.getItem(type + 'gridFState'));
	const gridUState = JSON.parse(localStorage.getItem(type + 'gridUState'));
	const gridBankState = JSON.parse(localStorage.getItem(type + 'gridBankState'));

	if (gridSState && gridAState && gridBState && gridCState && gridDState && gridFState && gridUState && gridBankState) {
		gridSState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridS, -1);
		});
		gridAState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridA, -1);
		});
		gridBState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridB, -1);
		});
		gridCState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridC, -1);
		});
		gridDState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridD, -1);
		});
		gridFState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridF, -1);
		});
		gridUState.forEach(id => {
			const element = document.querySelector(`[data-id="${id}"]`);
			gridBank.send(element, gridU, -1);
		});
	}
}

function clearCache() {
	localStorage.removeItem(type + 'gridSState');
	localStorage.removeItem(type + 'gridAState');
	localStorage.removeItem(type + 'gridBState');
	localStorage.removeItem(type + 'gridCState');
	localStorage.removeItem(type + 'gridDState');
	localStorage.removeItem(type + 'gridFState');
	localStorage.removeItem(type + 'gridUState');
	localStorage.removeItem(type + 'gridBankState');
	location.reload()
}

document.querySelectorAll('.board-item').forEach(element => {
	element.addEventListener('mouseenter', (event) => {
		if (!dragging) {
			timer = setTimeout(() => {
				var customImage = event.target.querySelector('img:nth-child(2)');
				var newPosX;
				var newPosY;
				var imageSource;
				if (customImage == null) {
					var pos = getOffset(event.target);
					var rec = event.target.querySelector('img').getBoundingClientRect();
					newPosY = (pos.y - ((rec.bottom - rec.top) * 3.5) + 5);
					newPosX = (pos.x - (((rec.right - rec.left) * 3.5) / 2)) + ((rec.right - rec.left) / 2);
					imageSource = event.target.querySelector('img').src;
				} else {
					imageSource = customImage.src;
					const img = new Image();
					img.src = imageSource;
					var pos = getOffset(event.target);
					// Is this working correctly?
					newPosY = (pos.y - img.height - 50);
					newPosX = (pos.x - (img.width / 2)) + 40;
					document.querySelector('.preview-container p').innerHTML = imageSource.replace(/^.*[\\\/]/, '').replace(/\..+/, '').replaceAll(/_/g, ' ');
				}
				if (newPosY < 8) {
					newPosY = event.target.getBoundingClientRect().bottom + 10;
				}
				if (newPosX < 8) {
					newPosX = 8;
				}
				document.querySelector('.preview-container').style.top = newPosY + 'px';
				document.querySelector('.preview-container').style.left = newPosX + 'px';
				document.querySelector('.preview-container img').src = imageSource;
				// Check for overflow to the right of the screen and fix if able
				if (document.querySelector('.preview-container img').getBoundingClientRect().right > window.innerWidth - 25) {
					document.querySelector('.preview-container').style.left = newPosX - (document.querySelector('.preview-container img').getBoundingClientRect().right - window.innerWidth) - 25 + 'px';
				}
				document.querySelector('.preview-container').style.visibility = 'visible';
			}, 700);
		}
	});
	element.addEventListener('mouseleave', (event) => {
		clearTimeout(timer);
		discardHover();
	});
});

function discardHover() {
	document.querySelector('.preview-container').style.visibility = 'hidden';
}

function getOffset(el) {
	const rect = el.getBoundingClientRect();
	return {
		x: rect.left + window.scrollX,
		y: rect.top + window.scrollY
	};
}