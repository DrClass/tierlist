export class PickerState {
    constructor(items) {
        if (!items) {
            throw new Error('No items specified for PickerState');
        }
        this.items = copyArray(items);
        this.arrays = {
            eliminated: [],
            survived: [],
            current: this.items.slice(0),
            evaluating: [],
            favorites: []
        };
        this.settings = {
            minBatchSize: 1,
            maxBatchSize: 20
        };
        this.batchSize = this.getBatchSize(this.arrays.current.length);

        shuffle(this.arrays.current);

        this.nextBatch();
    }

    getBatchSize(currentSize) {
        return Math.max(2, this.settings.minBatchSize || 2, Math.min(this.settings.maxBatchSize || 20, Math.ceil(currentSize / 5)));
    }

    validate() {
        // Fix and log any issues with the current state
    }

    nextBatch() {
        if (this.arrays.current.length < this.batchSize && this.arrays.survived.length > 0) {
            this.nextRound();
            return;
        }
        this.arrays.evaluating = this.arrays.current.splice(0, this.batchSize);
    }

    nextRound() {
        if (this.arrays.current.length === 0 && this.arrays.survived.length === 1) {
            this.addToFavorites(this.arrays.survived.pop());
            this.nextRound();
            return;
        }
        shuffle(this.arrays.survived);
        this.arrays.current = this.arrays.current.concat(this.arrays.survived.splice(0, this.arrays.survived.length));
        this.batchSize = this.getBatchSize(this.arrays.current.length);
        this.nextBatch();
    }

    addToFavorites(item) {
        this.arrays.favorites.push(item);
        this.removeFromEliminated(item);
    }

    removeFromEliminated(item) {
        for (let i = this.arrays.eliminated.length - 1; i >= 0; i--) {
            let idx = this.findById(item.id, this.arrays.eliminated[i].eliminatedBy);
            if (idx !== -1) {
                this.removeEliminatedBy(i, idx);
            }
        }
    }

    removeEliminatedBy(i, j) {
        this.arrays.eliminated[i].eliminatedBy.splice(j, 1);
        if (this.arrays.eliminated[i].eliminatedBy.length === 0) {
            this.arrays.survived.push(this.arrays.eliminated.splice(i, 1)[0].id);
        }
    }

    findById(id, array) {
        for (let i = 0; i < array.length; i++) {
            if (array[i] == id || array[i].id == id) {
                return i;
            }
        }
        return -1;
    }

    pick(ids) {
        for (let i = 0; i < this.arrays.evaluating.length; i++) {
            if (this.findById(this.arrays.evaluating[i].id, ids) !== -1) {
                this.arrays.survived.push(this.arrays.evaluating[i]);
            } else {
                this.arrays.eliminated.push({id: this.arrays.evaluating[i], eliminatedBy: ids.slice(0)});
            }
        }
        this.arrays.evaluating = [];
        this.nextBatch();
    }
}

export class Picker {
    constructor(items) {
        // TODO:
        this.state = new PickerState(items);
    }

    getSelectedIds() {
        return Array.from(document.querySelectorAll("li.selected")).map(li => li.id);
    }

    getCurrentBatch() {
        return this.state.arrays.evaluating;
    }

    getRemainingToEliminate() {
        return this.state.items.length - this.state.arrays.eliminated.length;
    }

    getRemainingToEliminatePercent() {
        return 100 - ((this.getRemainingToEliminate() / this.state.items.length) * 100);
    }

    pick() {
        let selected = this.getSelectedIds();
        if (selected.length === 0) {
            alert('You must select something first! If you\'re indifferent, press Pass.')
            return;
        }
        this.state.pick(selected);
        // TODO: update history
    }

    pass() {
        // Take all the the currently displayed items and just shuffle them back into the backlog
        this.state.arrays.current.push(...this.state.arrays.evaluating);
        shuffle(this.state.arrays.current);
        this.state.arrays.evaluating = [];
        this.state.nextBatch();
    }

    getFavorites() {
        return this.state.arrays.favorites;
    }
}

function copyArray(array) {
    let result = [];
    for (let i = 0; i < array.length; i++) {
        if (array[i] && typeof array[i] === 'object') {
            if (Array.isArray(array[i])) {
                result[i] = copyArray(array[i]);
            }
            else {
                result[i] = copyObject(array[i]);
            }
        }
        else {
            result[i] = array[i];
        }
    }
    return result;
}

function copyObject() {
    let result = {};

    for (let a = 0; a < arguments.length; a++) {
        for (let key in arguments[a]) {
            if (arguments[a].hasOwnProperty(key)) {
                if (arguments[a][key] && typeof arguments[a][key] === 'object') {
                    if (Array.isArray(arguments[a][key])) {
                        result[key] = copyArray(arguments[a][key]);
                    }
                    else {
                        result[key] = copyObject(arguments[a][key]);
                    }
                }
                else {
                    result[key] = arguments[a][key];
                }
            }
        }
    }
    return result;
}

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}