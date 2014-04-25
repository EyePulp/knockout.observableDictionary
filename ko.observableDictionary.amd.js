define(['knockout',], function(ko) {

    // Knockout Observable Dictionary
    // (c) James Foster
    // License: MIT (http://www.opensource.org/licenses/mit-license.php)
    // edits by a.hughes/mirusresearch


    ko.observableDictionary = function (dictionary) {
        var result = {};
        result.items     = new ko.observableArray();
        result._wrappers = {};
        ko.utils.extend(result, ko.observableDictionary['fn']);
        result.update(dictionary || {});

        return result;
    };

    ko.observableDictionary['fn'] = {
        remove: function (valueOrPredicate) {
            var predicate = valueOrPredicate;

            if (valueOrPredicate instanceof DictionaryItem) {
                predicate = function (item) {
                    return item.key() === valueOrPredicate.key();
                };
            }
            else if (typeof valueOrPredicate !== "function") {
                predicate = function (item) {
                    return item.key() === valueOrPredicate;
                };
            }

            ko.observableArray['fn'].remove.call(this.items, predicate);
        },

        push: function (key, value) {
            var item;
            if (!key){
                console.error('ko.observableDictionary: cannot push an key that is',typeof key);
                return;
            }

            // handle the case where only a DictionaryItem is passed in
            if (key instanceof DictionaryItem) {
                item  = key;
                value = item.value();
                key   = item.key();
            }

            var current = this.get(key, false);
            if (current) { // update existing item and get out of dodge
                current(value);
                return current;
            }

            if (!item) { // create a new item
                item = new DictionaryItem(key, value, this);
                ko.observableArray['fn'].push.call(this.items, item);
            }
            return value;
        },


        update: function(dictionary){
            for (var key in dictionary) {
                if (dictionary.hasOwnProperty(key)) {
                    this.push(key,dictionary[key]);
                }
            }
        },

        sort: function (method) {
            if (method === undefined) {
                method = function (a, b) {
                    return defaultComparison(a.key(), b.key());
                };
            }

            return ko.observableArray['fn'].sort.call(this.items, method);
        },

        indexOf: function (key) {
            if (key instanceof DictionaryItem) {
                return ko.observableArray['fn'].indexOf.call(this.items, key);
            }

            var underlyingArray = this.items();
            for (var index = 0; index < underlyingArray.length; index++) {
                if (underlyingArray[index].key() === key){
                    return index;
                }
            }
            return -1;
        },

        get: function (key, wrap) {
            if (wrap === false){
                return getValue(key, this.items());
            }

            var wrapper = this._wrappers[key];

            if (!wrapper) {
                wrapper = this._wrappers[key] = new ko.computed({
                    read: function () {
                        var value = getValue(key, this.items());
                        return value ? value() : null;
                    },
                    write: function (newValue) {
                        var value = getValue(key, this.items());

                        if (value){
                            value(newValue);
                        }else{
                            this.push(key, newValue);
                        }
                    }
                }, this);
            }

            return wrapper;
        },

        set: function (key, value) {
            return this.push(key, value);
        },

        keys: function () {
            return ko.utils.arrayMap(this.items(), function (item) { return item.key(); });
        },

        values: function () {
            return ko.utils.arrayMap(this.items(), function (item) { return item.value(); });
        },

        removeAll: function () {
            this.items.removeAll();
        },

        toJSON: function () {
            return JSON.stringify(this.toJS());
        },

        toJS: function () {
            var result = {};
            var items = ko.utils.unwrapObservable(this.items);

            ko.utils.arrayForEach(items, function (item) {
                var key = ko.utils.unwrapObservable(item.key);
                var value = ko.utils.unwrapObservable(item.value);
                result[key] = value;
            });

            return result;
        }
    };

    function DictionaryItem(key, value, dictionary) {
        var observableKey = new ko.observable(key);

        this.value = new ko.observable(value);
        this.key = new ko.computed({
            read: observableKey,
            write: function (newKey) {
                var current = observableKey();

                if (current === newKey){
                    return;
                }

                // no two items are allowed to share the same key.
                dictionary.remove(newKey);

                observableKey(newKey);
            }
        });
    }

    function getValue(key, items) {
        var found = ko.utils.arrayFirst(items, function (item) {
            return item.key() === key;
        });
        return found ? found.value : null;
    }

    // Utility methods
    // ---------------------------------------------
    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function defaultComparison(a, b) {
        if (isNumeric(a) && isNumeric(b)) {
            return a - b;
        }
        a = a.toString();
        b = b.toString();

        return a === b ? 0 : (a < b ? -1 : 1);
    }
    // ---------------------------------------------

});
