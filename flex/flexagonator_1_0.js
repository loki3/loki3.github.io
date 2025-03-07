"use strict";
var Flexagonator;
(function (Flexagonator) {
    /** check if two flex sequences have the same effect on a given flexagon */
    function checkEqual(flexagon, aFlexes, bFlexes, useFlexes) {
        // validate & check if sequences are exactly equal
        const result = checkExact(flexagon, aFlexes, bFlexes, useFlexes);
        if (Flexagonator.isFlexError(result)) {
            return result;
        }
        if (result === true) {
            return 'exact';
        }
        // can 'b' be done on the structure created by 'a'?
        if (equalAfterGeneratingOne(flexagon, aFlexes, bFlexes, useFlexes)) {
            return 'aFirst';
        }
        // can 'a' be done on the structure created by 'b'?
        if (equalAfterGeneratingOne(flexagon, bFlexes, aFlexes, useFlexes)) {
            return 'bFirst';
        }
        // it's possible that both sequences create different structure,
        // but they otherwise have the same effect
        if (equalAfterGeneratingBoth(flexagon, aFlexes, bFlexes, useFlexes)) {
            return 'approx';
        }
        return 'unequal';
    }
    Flexagonator.checkEqual = checkEqual;
    /** check if two sequences are exactly equal */
    function checkExact(flexagon, aFlexes, bFlexes, useFlexes) {
        // apply 'a' to input
        const fmA = new Flexagonator.FlexagonManager(flexagon, undefined, useFlexes);
        const resultA = fmA.applyFlexes(aFlexes, false);
        if (Flexagonator.isFlexError(resultA)) {
            return resultA;
        }
        // apply 'b' to input
        const fmB = new Flexagonator.FlexagonManager(flexagon, undefined, useFlexes);
        const resultB = fmB.applyFlexes(bFlexes, false);
        if (Flexagonator.isFlexError(resultB)) {
            return resultB;
        }
        // if results are identical, they're exactly equal
        const treeA = fmA.flexagon.getAsLeafTrees();
        const treeB = fmB.flexagon.getAsLeafTrees();
        if (Flexagonator.areLTArraysEqual(treeA, treeB)) {
            return true;
        }
        // it's possible they both created the exact same structure, but in a different order,
        // which means the leaf ids differ, so try B after using A as a generating sequence,
        // but only if they both generated the same number of leaves
        if (fmA.flexagon.getLeafCount() === fmB.flexagon.getLeafCount()) {
            if (equalAfterGeneratingOne(flexagon, aFlexes, bFlexes, useFlexes)) {
                return true;
            }
        }
        return false;
    }
    /** use sequence1 as a generating sequence & then see if sequence produces the same result */
    function equalAfterGeneratingOne(flexagon, sequence1, sequence2, useFlexes) {
        const fm = new Flexagonator.FlexagonManager(flexagon, undefined, useFlexes);
        // apply sequence1 as a generating sequence from base state
        fm.applyFlexes(sequence1, false);
        const tree1 = fm.flexagon.getAsLeafTrees();
        // apply sequence2 from base state
        fm.applyInReverse(sequence1);
        fm.applyFlexes(sequence2, false);
        const tree2 = fm.flexagon.getAsLeafTrees();
        return Flexagonator.areLTArraysEqual(tree1, tree2);
    }
    /** apply both generating sequences & then see if the sequences produce the same result */
    function equalAfterGeneratingBoth(flexagon, aFlexes, bFlexes, useFlexes) {
        const fm = new Flexagonator.FlexagonManager(flexagon, undefined, useFlexes);
        // apply both generating sequences from base state
        fm.applyFlexes(aFlexes, false);
        fm.applyInReverse(aFlexes);
        fm.applyFlexes(bFlexes, false);
        fm.applyInReverse(bFlexes);
        // find result of applying each sequence
        fm.applyFlexes(aFlexes, false);
        const tree1 = fm.flexagon.getAsLeafTrees();
        fm.applyInReverse(aFlexes);
        fm.applyFlexes(bFlexes, false);
        const tree2 = fm.flexagon.getAsLeafTrees();
        return Flexagonator.areLTArraysEqual(tree1, tree2);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** count the number of states that support each flex */
    function countStatesThatSupportFlexes(allRelFlexes) {
        const counts = {};
        for (const relFlexes of allRelFlexes) {
            // now we have all the flexes that can be done from one state
            // find all the flexes that can be performed here
            const flexList = [];
            for (const relFlex of relFlexes) {
                if (!flexList.find(x => (x === relFlex.flex))) {
                    flexList.push(relFlex.flex);
                }
            }
            // bump the master counts
            for (const flex of flexList) {
                if (counts[flex] === undefined) {
                    counts[flex] = 1;
                }
                else {
                    counts[flex]++;
                }
            }
        }
        return counts;
    }
    Flexagonator.countStatesThatSupportFlexes = countStatesThatSupportFlexes;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * object that can explore all the states available
     * starting from an initial state
     * and applying any of a given set of flexes
     */
    class Explore {
        constructor(flexagon, flexes, right, over) {
            // the following 3 collections are aligned with each other
            this.flexagons = [];
            this.found = [];
            // flexagons grouped by pat structure (cached)
            this.grouped = null;
            // initialize flexes
            this.right = right;
            this.over = over;
            this.flexes = {};
            for (const f in flexes) {
                if (f !== '>' && f !== '<' && f !== '^') {
                    this.flexes[f] = flexes[f];
                }
            }
            // initialize flexagon tracking
            this.flexagons.push(flexagon);
            this.tracker = Flexagonator.Tracker.make(flexagon);
            this.current = 0;
        }
        getTotalStates() {
            return this.flexagons.length;
        }
        getExploredStates() {
            return this.current;
        }
        getFlexagons() {
            return this.flexagons;
        }
        getFoundFlexes() {
            return this.found;
        }
        getFlexGraph() {
            return new Flexagonator.FlexGraph(this.flexagons, this.found);
        }
        /** get lists of flexagons grouped by pat structure (computed then cached) */
        fetchGroupByStructure() {
            if (this.grouped === null || this.grouped.length === 0) {
                this.grouped = Flexagonator.groupByStructure(this.flexagons);
            }
            return this.grouped;
        }
        /**
         * check the next unexplored state
         * returns false once there are no more states to explore
         */
        checkNext() {
            if (this.current === this.flexagons.length) {
                return false;
            }
            let flexagon = this.flexagons[this.current];
            const count = flexagon.getPatCount();
            const found = [];
            // rotate & flip over, applying all flexes at each step
            this.checkAllFlexes(flexagon, found, 0, false);
            if (this.right) {
                for (let i = 1; i < count; i++) {
                    flexagon = this.right.apply(flexagon);
                    this.checkAllFlexes(flexagon, found, i, false);
                }
            }
            if (this.over) {
                flexagon = this.over.apply(this.flexagons[this.current]);
                this.checkAllFlexes(flexagon, found, 0, true);
                if (this.right) {
                    for (let i = 1; i < count; i++) {
                        flexagon = this.right.apply(flexagon);
                        this.checkAllFlexes(flexagon, found, i, true);
                    }
                }
            }
            this.found[this.current] = found;
            this.current++;
            return true;
        }
        // apply every flex at the current hinge,
        // every time we find a new state, track it
        checkAllFlexes(flexagon, found, rights, over) {
            for (const f in this.flexes) {
                const newFlexagon = this.flexes[f].apply(flexagon);
                if (!Flexagonator.isFlexError(newFlexagon)) {
                    let result = this.tracker.findMaybeAdd(newFlexagon);
                    if (result === null) {
                        // we have a new state
                        this.flexagons.push(newFlexagon);
                        result = this.flexagons.length - 1;
                    }
                    found.push(new Flexagonator.RelativeFlex(rights, over, f, result));
                }
            }
        }
    }
    Flexagonator.Explore = Explore;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Check if a flex can be expressed as a sequence of other flexes.
     * If so, return the shortest sequence, otherwise return false.
     */
    function findEqualFlexes(check, flexes) {
        flexes = removeFlex(flexes, 'change directions'); // for perf, don't use ~
        flexes = removeFlex(flexes, check.name);
        const input = Flexagonator.Flexagon.makeFromTree(check.input);
        const output = Flexagonator.Flexagon.makeFromTree(check.output);
        const explore = new Flexagonator.Explore(input, flexes, flexes[">"], flexes["^"]);
        while (explore.checkNext()) { }
        const findShortest = new Flexagonator.FindShortest(input, output, flexes, flexes[">"], flexes["^"]);
        while (findShortest.checkLevel()) { }
        return findShortest.wasFound() ? findShortest.getFlexes() : false;
    }
    Flexagonator.findEqualFlexes = findEqualFlexes;
    function removeFlex(flexes, toRemove) {
        const allNames = Object.getOwnPropertyNames(flexes);
        const inverse = 'inverse ' + toRemove;
        const someNames = allNames.filter(name => flexes[name].name !== toRemove && flexes[name].name !== inverse);
        const result = {};
        someNames.forEach(name => result[name] = flexes[name]);
        return result;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Find flex sequences that cycle starting from a given state within a list of flexagon states.
     * Restrict search to states that start & end with the same pat structure.
     */
    class FindGroupCycles {
        /**
         * @param states a list of flexagon states (perhaps the output of Explore())
         * @param start index of state to start from
         * @param flexes try sequences that use these flexes
         * @param groups flexagons (indices into states) grouped by pat structure (computed if not passed in)
         */
        constructor(states, start, flexes, groups) {
            this.states = states;
            this.start = start;
            this.flexes = flexes;
            this.groups = groups;
            this.error = null;
            // step 2
            this.cyclesDone = false;
            this.cyclesIndex = 0;
            // results
            this.cycles = [];
            this.right = flexes['>'];
            this.over = flexes['^'];
            if (this.right === undefined || this.over === undefined) {
                this.error = { groupCycleError: "need definitions for > and ^" };
            }
        }
        /**
         * do next incremental step of finding cycles,
         * returns false once it's completely done or there's an error
         */
        checkNext() {
            if (this.error !== null || this.cyclesDone) {
                return false; // done
            }
            // next slice of work
            if (this.searchStates === undefined) {
                return this.findSearchStates();
            }
            else if (!this.cyclesDone) {
                return this.checkNextCycle();
            }
            return false;
        }
        /** get info about cycles that were found */
        getCycles() {
            return this.cycles;
        }
        /** get error explanation, if any */
        getError() {
            return this.error;
        }
        /** total number of cycles, or 0 if we don't know yet */
        getCycleCount() {
            return this.searchStates !== undefined ? this.searchStates.length : 0;
        }
        /** how many cycles we've found */
        getFoundCount() {
            return this.cycles.length;
        }
        /** find all the flexagons with the same pat structure, which we'll search thru */
        findSearchStates() {
            var _a;
            const groups = (_a = this.groups) !== null && _a !== void 0 ? _a : Flexagonator.groupByStructure(this.states);
            const searchStates = findStructureGroup(groups, this.start);
            if (searchStates === null) {
                this.error = { groupCycleError: "invalid start" };
                return false;
            }
            else if (searchStates.length === 0) {
                this.error = { groupCycleError: "no other states with same pat structure" };
                return false;
            }
            this.searchStates = searchStates;
            return true; // still more steps
        }
        /** find sequence that goes from start to next target & see how long it takes to cycle */
        checkNextCycle() {
            if (this.searchStates === undefined) {
                return false;
            }
            const start = this.states[this.start];
            if (this.findSequence === undefined) {
                // start a new search for a sequence from start to next target
                const end = this.states[this.searchStates[this.cyclesIndex]];
                this.findSequence = new Flexagonator.FindShortest(start, end, this.flexes, this.right, this.over);
                return true; // keep going
            }
            else if (this.findSequence.checkLevel()) {
                return true; // keep going
            }
            // done with search
            const result = this.findSequence.getFlexes();
            this.findSequence = undefined;
            // see if we need to shift to get back to original pat structure
            const extra = extraNeeded(start, result, this.flexes);
            const sequence = extra === null ? "" : extra === "" ? result : `${result} ${extra}`;
            // get length of cycle
            const cycleLength = getCycleLength(start, this.flexes, sequence);
            this.cycles.push({ sequence, cycleLength });
            // are we completely done?
            this.cyclesDone = ++this.cyclesIndex >= this.searchStates.length;
            return !this.cyclesDone;
        }
    }
    Flexagonator.FindGroupCycles = FindGroupCycles;
    function isGroupCycleError(result) {
        return result && result.groupCycleError !== undefined;
    }
    Flexagonator.isGroupCycleError = isGroupCycleError;
    /** return the indices into 'states' of all the flexagons that share the pat structure of states[index] */
    function findStructureGroup(groups, index) {
        for (let i = 0; i < groups.length; i++) {
            for (const j of groups[i]) {
                if (j === index) {
                    return groups[i].filter(k => k !== index);
                }
            }
        }
        return null;
    }
    /** return any additional shifts needed to preserve the pat structure, or null if not supported */
    function extraNeeded(f1, sequence, flexes) {
        const fm = new Flexagonator.FlexagonManager(f1, undefined, flexes);
        fm.applyFlexes(sequence, false);
        let extra = "";
        for (let i = 0; i < f1.getPatCount(); i++) {
            if (f1.isSameStructure(fm.flexagon)) {
                return extra;
            }
            fm.applyFlex(">");
            extra += ">";
        }
        fm.applyFlex("^");
        extra = "^";
        for (let i = 0; i < f1.getPatCount(); i++) {
            if (f1.isSameStructure(fm.flexagon)) {
                return extra;
            }
            fm.applyFlex(">");
            extra += ">";
        }
        return null;
    }
    /**
     * find out how long it takes flex sequence to cycle back to original state,
     * assumes we already know that 'sequence' preserves the original pat structure
     */
    function getCycleLength(original, flexes, sequence) {
        const fm = new Flexagonator.FlexagonManager(original, undefined, flexes);
        for (let i = 0; i < maxIterations; i++) {
            fm.applyFlexes(sequence, false);
            if (original.isSameState(fm.flexagon)) {
                return i + 1;
            }
        }
        return -1;
    }
    const maxIterations = 1000;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * search through a collection of flexagons for any that have a rearranged version of a given pat
     * @returns the indices of any matching flexagons
     */
    function findRearrangements(flexagons, leafTree) {
        const pat = Flexagonator.makePat(leafTree);
        if (Flexagonator.isError(pat)) {
            return pat;
        }
        const flipped = pat.makeFlipped();
        const patIds = getSortedIds(pat);
        const leafCount = patIds.length;
        const found = [];
        for (let i = 0; i < flexagons.length; i++) {
            const flexagon = flexagons[i];
            for (const thisPat of flexagon.pats) {
                if (leafCount === thisPat.getLeafCount() && !pat.isEqual(thisPat) && !flipped.isEqual(thisPat)) {
                    const thisIds = getSortedIds(thisPat);
                    if (patIds.every((v, j) => thisIds[j] === v)) {
                        found.push(i);
                        continue;
                    }
                }
            }
        }
        return found;
    }
    Flexagonator.findRearrangements = findRearrangements;
    /** get a sorted list of all leaf ids in the given pat */
    function getSortedIds(pat) {
        const ids = getIds(pat.getAsLeafTree());
        return ids.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    }
    /** get a list of all positive ids in this LeafTree */
    function getIds(tree) {
        if (typeof (tree) === "number") {
            return [Math.abs(tree)];
        }
        if (Array.isArray(tree) && tree.length === 2) {
            const ids1 = getIds(tree[0]);
            const ids2 = getIds(tree[1]);
            return ids1.concat(ids2);
        }
        return [];
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * object that searches for the shortest flex sequence from a starting state
     * to an ending state using a given set of sequences.
     * NOTE: returns the first sequence it finds, though
     * there may be others of the same length
     */
    class FindShortest {
        static make(start, end, flexes, right, over) {
            const startFlexagon = Flexagonator.Flexagon.makeFromTree(start);
            if (Flexagonator.isTreeError(startFlexagon)) {
                return startFlexagon;
            }
            const endFlexagon = Flexagonator.Flexagon.makeFromTree(end);
            if (Flexagonator.isTreeError(endFlexagon)) {
                return endFlexagon;
            }
            return new FindShortest(startFlexagon, endFlexagon, flexes, right, over);
        }
        // we're at 'start' and we want to find the shortest flex sequence from 'flexes'
        // that will take us to 'end'
        constructor(start, end, flexes, right, over) {
            // array of levels of the breadth-first search
            this.levels = [];
            // the following 2 collections are aligned with each other
            this.flexagons = [];
            this.found = false;
            // initialize flexes
            this.right = right;
            this.over = over;
            this.flexes = {};
            for (const f in flexes) {
                if (f !== '>' && f !== '<' && f !== '^') {
                    this.flexes[f] = flexes[f];
                }
            }
            // initialize flexagon tracking
            this.flexagons.push(start);
            this.tracker = Flexagonator.Tracker.make(start);
            this.flexagons.push(end);
            this.target = this.tracker.findMaybeAdd(end) === null ? 1 : 0;
            // add first level of search
            const relflex = new Flexagonator.RelativeFlex(0, false, "", 0);
            const level = [{ flex: relflex, previous: -1 }];
            this.levels.push(level);
        }
        wasFound() {
            return this.found;
        }
        // the max number of flexes we considered
        getMaxDepth() {
            return this.levels.length;
        }
        // if the target flexagon was found, get the flex sequence used
        getFlexes() {
            if (!this.found) {
                return "";
            }
            let flexes = "";
            const finalLevel = this.levels[this.levels.length - 1];
            let stepN = finalLevel.length - 1;
            for (let i = this.levels.length - 1; i >= 0; i--) {
                const step = this.levels[i][stepN];
                flexes = step.flex.getSequence() + ' ' + flexes;
                stepN = step.previous;
            }
            return flexes.trim();
        }
        // returns false once the search is done
        checkLevel() {
            const lastLevel = this.levels[this.levels.length - 1];
            if (lastLevel.length === 0) {
                // we found nothing in the last level, so the search failed
                return false;
            }
            const thisLevel = [];
            this.levels.push(thisLevel);
            // check every step in the last level of our breadth first search
            for (let whichStep = 0, len = lastLevel.length; whichStep < len; whichStep++) {
                const flexagon = this.flexagons[lastLevel[whichStep].flex.toState];
                if (!this.checkStep(flexagon, thisLevel, whichStep)) {
                    this.found = true;
                    return false;
                }
            }
            return true;
        }
        // find all the flexes we can perform from this flexagon,
        // add any new states to 'level', referencing 'previousStep'.
        // return false if we've found the target flexagon
        checkStep(flexagon, level, previousStep) {
            const count = flexagon.getPatCount();
            const original = flexagon;
            // rotate & flip over, applying all flexes each time
            if (!this.checkAllFlexes(flexagon, level, previousStep, 0, false))
                return false;
            if (this.right) {
                for (let i = 1; i < count; i++) {
                    flexagon = this.right.apply(flexagon);
                    if (!this.checkAllFlexes(flexagon, level, previousStep, i, false))
                        return false;
                }
            }
            if (this.over) {
                flexagon = this.over.apply(original);
                if (!this.checkAllFlexes(flexagon, level, previousStep, 0, true))
                    return false;
                if (this.right) {
                    for (let i = 1; i < count; i++) {
                        flexagon = this.right.apply(flexagon);
                        if (!this.checkAllFlexes(flexagon, level, previousStep, i, true))
                            return false;
                    }
                }
            }
            return true;
        }
        // apply every flex at the current hinge,
        // every time we find a new state, track it.
        // return false if we've found the target flexagon
        checkAllFlexes(flexagon, level, previousStep, rights, over) {
            for (const f in this.flexes) {
                const newFlexagon = this.flexes[f].apply(flexagon);
                if (!Flexagonator.isFlexError(newFlexagon)) {
                    let result = this.tracker.findMaybeAdd(newFlexagon);
                    if (result === null) {
                        // we have a new state
                        this.flexagons.push(newFlexagon);
                        result = this.flexagons.length - 1;
                        // push new step onto the current level of the search
                        const relflex = new Flexagonator.RelativeFlex(rights, over, f, result);
                        level.push({ flex: relflex, previous: previousStep });
                    }
                    else if (result === this.target) {
                        // we're done with the search
                        const relflex = new Flexagonator.RelativeFlex(rights, over, f, result);
                        level.push({ flex: relflex, previous: previousStep });
                        return false;
                    }
                }
            }
            return true;
        }
    }
    Flexagonator.FindShortest = FindShortest;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * if you can't access the entire graph with a given flex,
     * figure out how many subgraphs there are
     */
    function findSubgraphs(relFlexesList, flex) {
        const find = new FindSubgraphs(relFlexesList, flex);
        return find.findSubgraphs();
    }
    Flexagonator.findSubgraphs = findSubgraphs;
    class FindSubgraphs {
        constructor(relFlexesList, flex) {
            this.relFlexesList = relFlexesList;
            this.flex = flex;
            // maps state index to the subgraph number the state is in
            this.stateToSubgraph = [];
            // list of states in each subgraph
            this.statesInSubgraph = [];
        }
        // examine the graph to find out how many subgraphs there are when limited to the given flex,
        // returns number of distinct subgraphs
        findSubgraphs() {
            this.relFlexesList.forEach((relFlexes, stateId) => this.checkOne(relFlexes, stateId));
            const uniqueSubgraphs = this.getDistinctCount();
            const sizesAndSubgraphCounts = this.getSizesAndSubgraphCounts();
            return { uniqueSubgraphs, sizesAndSubgraphCounts };
        }
        // check all the states pointed to by a single state
        checkOne(relFlexes, stateId) {
            const [subGraphs, unknownStates] = this.getPointers(relFlexes, stateId);
            if (subGraphs.length > 0 || unknownStates.length > 0) {
                this.assignSubgraphs(stateId, subGraphs, unknownStates);
            }
        }
        // returns two lists of references to other states:
        //  [existing subgraphs this state points to], [states with unknown subgraph numbers]
        getPointers(relFlexes, stateId) {
            const subGraphs = [];
            const unknownStates = [];
            relFlexes.forEach(relFlex => {
                if (relFlex.flex === this.flex) {
                    const otherState = this.stateToSubgraph[relFlex.toState];
                    if (otherState === undefined) {
                        if (unknownStates.find(v => v === relFlex.toState) === undefined) {
                            unknownStates.push(relFlex.toState);
                        }
                    }
                    else {
                        // points to a a state that's already part of a subgraph
                        if (subGraphs.find(v => v === otherState) === undefined) {
                            subGraphs.push(otherState);
                        }
                    }
                }
            });
            return [subGraphs, unknownStates];
        }
        // based on existing subgraphs this state points to & states with an unknown subgraph,
        // figure out how to assign a uniied subgraph number to all those states
        assignSubgraphs(stateId, subGraphs, unknownStates) {
            const unset = [stateId].concat(unknownStates);
            switch (subGraphs.length) {
                case 0:
                    // all states are part of new subgraph
                    this.assignNumberToAll(stateId, unset);
                    break;
                case 1:
                    // state only pointed to a single subgraph, so use that
                    this.assignNumberToAll(subGraphs[0], unset);
                    break;
                default:
                    // pointed to different subgraphs that should be turned into one
                    this.unifySubgraphs(subGraphs, unset);
                    break;
            }
        }
        // assign everything in 'unset' the number 'subgraph'
        assignNumberToAll(subgraph, unset) {
            unset.forEach(state => this.stateToSubgraph[state] = subgraph);
            if (this.statesInSubgraph[subgraph] === undefined) {
                this.statesInSubgraph[subgraph] = unset;
            }
            else {
                const current = this.statesInSubgraph[subgraph];
                let added = [];
                unset.forEach(state => {
                    if (current.find(s => s === state) === undefined) {
                        added.push(state);
                    }
                });
                if (added.length > 0) {
                    this.statesInSubgraph[subgraph] = current.concat(added);
                }
            }
        }
        // state pointed to multiple existing subgraphs, which we now know are all part of the same subgraph
        unifySubgraphs(existing, unset) {
            const subgraph = existing[0]; // assign everything to this subgraph
            existing.slice(1).forEach(one => {
                this.statesInSubgraph[one].forEach(a => this.stateToSubgraph[a] = subgraph);
                this.statesInSubgraph[subgraph] = this.statesInSubgraph[subgraph].concat(this.statesInSubgraph[one]);
                this.statesInSubgraph[one] = [];
            });
            this.assignNumberToAll(subgraph, unset);
        }
        // count how many distinct subgraphs were found
        getDistinctCount() {
            return this.statesInSubgraph.reduce((prev, current) => prev + (current.length === 0 ? 0 : 1), 0);
        }
        // get stats on the results
        getSizesAndSubgraphCounts() {
            const counts = [];
            this.statesInSubgraph.forEach(states => {
                const size = states.length;
                if (counts[size] === undefined) {
                    counts[size] = 1;
                }
                else {
                    counts[size] = counts[size] + 1;
                }
            });
            const result = [];
            counts.forEach((count, index) => {
                if (index !== 0) {
                    result.push({ size: index, subgraphCount: count });
                }
            });
            return result;
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // information about a graph of flexagons (nodes) and flexes (edges)
    class FlexGraph {
        constructor(flexagons, relativeFlexes) {
            this.flexagons = flexagons;
            this.relativeFlexes = relativeFlexes;
            this.tracker = null;
        }
        // input: a description of the visible leaves [ [top1, top2...], [bottom1,  bottom2...] ]
        // output: all the flexagons that match, if any
        findVisible(visible) {
            if (this.tracker === null) {
                this.tracker = new Flexagonator.TrackerVisible(this.flexagons);
            }
            if (visible.length != 2 || visible[0].length !== visible[1].length) {
                return [];
            }
            return this.tracker.find(visible[0], visible[1]);
        }
    }
    Flexagonator.FlexGraph = FlexGraph;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * take a description of all the flexes that can be performed from each state
     * and create a simple description of which states can be reach from each state.
     * if 'oneway', only list transitions from smaller states to larger
     */
    function getStateToState(allRelFlexes, oneway) {
        const result = [];
        for (const i in allRelFlexes) {
            // find all the states that can be reached from this state
            const thisState = Number.parseInt(i);
            const states = [];
            for (const relFlex of allRelFlexes[i]) {
                if (oneway && thisState > relFlex.toState) {
                    continue;
                }
                if (!states.find(x => (x === relFlex.toState))) {
                    states.push(relFlex.toState);
                }
            }
            result[i] = states;
        }
        return result;
    }
    Flexagonator.getStateToState = getStateToState;
    /**
     * take a description of all the flexes that can be performed from each state
     * and create a list of which flexes can be used to get to other states,
     * while ignoring rotations
     */
    function getSimpleFlexGraph(allRelFlexes, oneway) {
        const result = [];
        for (const i in allRelFlexes) {
            // check all flexes from this state
            const thisState = Number.parseInt(i);
            const flexes = [];
            for (const relFlex of allRelFlexes[i]) {
                if (oneway) {
                    const flexname = Flexagonator.makeFlexName(relFlex.flex);
                    // only output flex if we're flexing to a state later in the list (to avoid double counting)
                    // -or- if this is an inverse taking us to a state that we can't flex back to w/ the same flex
                    if (relFlex.toState > thisState || hasOneWayInverse(flexname, thisState, allRelFlexes[relFlex.toState])) {
                        flexes.push({ flex: relFlex.flex, state: relFlex.toState });
                    }
                }
                else {
                    flexes.push({ flex: relFlex.flex, state: relFlex.toState });
                }
            }
            result.push(flexes);
        }
        return result;
    }
    Flexagonator.getSimpleFlexGraph = getSimpleFlexGraph;
    // check if 'flexname' is an inverse flex that sends us to a state
    // that has a normal flex back to 'state'
    function hasOneWayInverse(flexname, state, other) {
        if (!flexname.isInverse) {
            return false;
        }
        return !other.some(relFlex => relFlex.flex === flexname.baseName && relFlex.toState === state);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Get a list of all the ways to fold a template into a single pat, or null if none
     * @param directions directions between leaves in the template to fold, e.g. /\\///
     */
    function getAllSinglePats(directions, flexes) {
        const dirs = toDirections(directions);
        if (dirs === null) {
            return null;
        }
        const template = toPattern(dirs);
        return tryFolds(template, flexes);
    }
    Flexagonator.getAllSinglePats = getAllSinglePats;
    /** the basic flexes needed to fold a strip */
    class FoldFlexes {
        constructor() {
            this.allFlexes = Flexagonator.makeAtomicFlexes('blocks');
        }
        shiftRight(pattern) {
            const result = this.allFlexes['>'].apply(pattern);
            return Flexagonator.isAtomicPatternError(result) ? false : result;
        }
        shiftLeft(pattern) {
            const result = this.allFlexes['<'].apply(pattern);
            return Flexagonator.isAtomicPatternError(result) ? false : result;
        }
        foldRight(pattern) {
            const result = this.allFlexes["Ur'"].apply(pattern);
            return Flexagonator.isAtomicPatternError(result) ? false : result;
        }
        foldLeft(pattern) {
            const result = this.allFlexes["Ul'"].apply(pattern);
            return Flexagonator.isAtomicPatternError(result) ? false : result;
        }
        /** reset current hinge to far left */
        reset(pattern) {
            let attempt = pattern;
            while (attempt !== false) {
                pattern = attempt;
                attempt = this.shiftLeft(pattern);
            }
            return pattern;
        }
    }
    Flexagonator.FoldFlexes = FoldFlexes;
    function toDirections(directions) {
        const dirs = [];
        for (const d of directions) {
            if (d === '/')
                dirs.push('/');
            else if (d === '\\' || d === '|')
                dirs.push('\\');
            else
                return null;
        }
        return dirs;
    }
    /** e.g., /\\ into 'a # 1 / 2 \ 3 \ b' */
    function toPattern(directions) {
        const right = directions.map((d, i) => {
            return { pat: Flexagonator.makePat(i + 1), direction: d };
        });
        return {
            otherLeft: 'a',
            left: null,
            right,
            otherRight: 'b',
            singleLeaf: false,
        };
    }
    /**
     * try folding at every hinge, recursing whenever successful
     * @returns list of all ways it can be folded into a single pat
     */
    function tryFolds(pattern, flexes) {
        const count = Flexagonator.getPatsCount(pattern.left) + Flexagonator.getPatsCount(pattern.right);
        if (count <= 1) {
            // we're down to a single pat, so return it
            const pats = Flexagonator.getAtomicPatternPats(pattern);
            const dirs = Flexagonator.getAtomicPatternDirections(pattern);
            const direction = dirs[dirs.length - 1];
            return { pats, direction };
        }
        // at each hinge, try folding left & right, recursing on success
        let pats = [];
        let direction = '/';
        pattern = flexes.reset(pattern);
        for (let i = 0; i < count; i++) {
            const tryLeft = flexes.foldLeft(pattern);
            if (tryLeft) {
                const pr = tryFolds(tryLeft, flexes);
                if (pr !== null) {
                    pats = addNonDupes(pats, pr.pats);
                    direction = pr.direction;
                }
            }
            else {
                const tryRight = flexes.foldRight(pattern);
                if (tryRight) {
                    const pr = tryFolds(tryRight, flexes);
                    if (pr !== null) {
                        pats = addNonDupes(pats, pr.pats);
                        direction = pr.direction;
                    }
                }
            }
            // step to next hinge
            const next = flexes.shiftRight(pattern);
            pattern = next ? next : pattern;
        }
        return pats.length === 0 ? null : { pats, direction };
    }
    function addNonDupes(pats1, pats2) {
        const pats = pats1.concat([]);
        for (const p2 of pats2) {
            if (pats.every(p => !p.isEqual(p2))) {
                pats.push(p2);
            }
        }
        return pats;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /*
      Utilities for creating DOT graph descriptions of the
      state transitions described by a list of RelativeFlexes
    */
    /**
     * create a DOT graph of just the state-to-state transitions,
     * ignoring flexes & rotations
     */
    function dotSimple(allRelFlexes) {
        const transitions = Flexagonator.getStateToState(allRelFlexes, true /*oneway*/);
        return dotSimpleGraph(transitions);
    }
    Flexagonator.dotSimple = dotSimple;
    function dotSimpleGraph(transitions) {
        let str = "graph {\n";
        for (const i in transitions) {
            for (const state of transitions[i]) {
                str += "  " + i + " -- " + state.toString() + '\n';
            }
        }
        str += "}";
        return str;
    }
    Flexagonator.dotSimpleGraph = dotSimpleGraph;
    const defaultDotProps = {
        P: "color=grey",
        V: "color=green",
        S: "color=red",
        T: "color=blue",
        T1: "color=blue",
        T2: "color=blue",
        T3: "color=blue",
        T4: "color=blue",
        T5: "color=blue",
        T6: "color=blue",
        T7: "color=blue",
        Tf: "color=blue",
        Ltf: "color=orange",
        Ltb: "color=brown",
        F: "color=magenta",
    };
    /**
     * create a DOT graph describing which flexes you can use to get between states,
     * ignoring rotations
     */
    function dotWithFlexes(allRelFlexes, oneway, props) {
        if (!props) {
            props = defaultDotProps;
        }
        const transitions = Flexagonator.getSimpleFlexGraph(allRelFlexes, oneway);
        let str = oneway ? "" : "di";
        str += "graph {\n";
        const connect = oneway ? " -- " : " -> ";
        for (const i in transitions) {
            for (const state of transitions[i]) {
                str += "  " + i + connect + state.state;
                str += getProps(state.flex, props);
                str += '\n';
            }
        }
        str += "}";
        return str;
    }
    Flexagonator.dotWithFlexes = dotWithFlexes;
    // lookup props either for the given name if it exists, or the base name,
    // e.g. if S' is passed, we'll try S if S' doesn't exist
    function getProps(flex, props) {
        // if there's an explicit property for this flex, use it
        if (props[flex]) {
            return " [" + props[flex] + "]";
        }
        // otherwise, use props for the base name, tacking on dashed if it's an inverse
        const flexname = Flexagonator.makeFlexName(flex);
        if (!props[flexname.baseName]) {
            return "";
        }
        let str = " [" + props[flexname.baseName];
        if (flexname.isInverse) {
            str += ", style=dashed";
        }
        return str + "]";
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function isGroupError(result) {
        return result && result.reason !== undefined;
    }
    Flexagonator.isGroupError = isGroupError;
    /** maximum number of repeats when checking for a cycle */
    const defaultMaxCycle = 100;
    /**
     * return info about the group created by using the given
     * flex sequences as the generators, or error if it doesn't form a group
     * @returns if it forms a group then return the Cayley table of the resulting group,
     * else explain why it's not a group
     */
    function getGroupFromSequences(sequences, numpats, directions, maxCycle) {
        // make a flexagon with the appropriate size & directions but no pat structure
        const tree = new Array(numpats).fill(0).map((_, i) => i + 1); // unique ids for leaves
        const plain = Flexagonator.Flexagon.makeFromTree(tree, undefined, directions);
        if (Flexagonator.isTreeError(plain)) {
            return { reason: 'bad-numpats' };
        }
        const plainFm = Flexagonator.FlexagonManager.make(plain);
        const morphs = Flexagonator.makeMorphFlexes(numpats);
        plainFm.addFlexes(morphs);
        // check each flex sequence for its cycle
        const flexSequences = sequences.map(s => Flexagonator.parseFlexSequence(s));
        const cycleCount = flexSequences.map(s => genTillCycle(plainFm, s, maxCycle !== undefined ? maxCycle : defaultMaxCycle));
        if (cycleCount.some(c => Flexagonator.isFlexError(c))) {
            const invalid = cycleCount.map(e => Flexagonator.isFlexError(e) ? e.flexName : undefined).filter(e => e !== undefined);
            return { reason: 'unsupported-flex', sequences: invalid };
        }
        const noCycle = cycleCount.map((c, i) => c === false ? sequences[i] : null).filter(s => s !== null);
        if (noCycle.length > 0) {
            return { reason: 'not-cyclic', sequences: noCycle };
        }
        // create minimal pat structure & validate that the sequences preserve it
        const flexElements = makeFlexElements(flexSequences, cycleCount);
        const minimalFlexagon = makeMinimalFlexagon(plainFm, flexElements);
        const minimalPats = minimalFlexagon.getAsLeafTrees();
        if (changesStructure(minimalFlexagon, flexSequences, morphs)) {
            return { reason: 'changes-structure', minimalPats };
        }
        const minimalFm = Flexagonator.FlexagonManager.make(minimalFlexagon);
        minimalFm.addFlexes(morphs);
        // build table
        const groupElements = makeGroupElements(cycleCount);
        const rows = makeRows(minimalFm, flexElements);
        if (isGroupError(rows)) {
            return Object.assign(Object.assign({}, rows), { minimalPats });
        }
        const commutative = isCommutative(rows);
        const table = {
            sequences,
            cycleLengths: cycleCount,
            groupElements: groupElements,
            flexElements: flexElements.map(seq => seq.map(f => f.fullName)).map(seq => seq.join('')),
            rows,
            commutative,
            minimalPats,
        };
        return table;
    }
    Flexagonator.getGroupFromSequences = getGroupFromSequences;
    /** check how long it takes for the flex sequence to cycle on the given flexagon, creating pat structure as needed */
    function genTillCycle(plainFm, sequence, maxCycle) {
        const genSequence = sequence.map(s => s.getGenerator());
        let lastCount = plainFm.flexagon.getLeafCount();
        for (let i = 0; i < maxCycle; i++) {
            // apply generating sequence
            const result = plainFm.applyFlexes(genSequence, false);
            if (Flexagonator.isFlexError(result)) {
                return result;
            }
            // once we didn't need to add any leaves, we have enough pat structure to check for cycle
            const thisCount = plainFm.flexagon.getLeafCount();
            if (lastCount === thisCount) {
                return checkForCycle(plainFm, genSequence, i - 1, maxCycle);
            }
            lastCount = thisCount;
        }
        // we added leaves every time, so no cycle
        return false;
    }
    /** if 'sequence' cycles on the flexagon, return how many times before it cycles */
    function checkForCycle(fm, sequence, minCycle, maxCycle) {
        const original = fm.flexagon.pats;
        minCycle = minCycle < 1 ? 1 : minCycle;
        for (let i = 0; i < maxCycle; i++) {
            fm.applyFlexes(sequence, false);
            const current = fm.flexagon.pats;
            if (i >= minCycle && original.every((p, pi) => p.isEqual(current[pi]))) {
                return i + 1;
            }
        }
        return false;
    }
    /** create all the flex sequences used to create the table */
    function makeFlexElements(genSequences, cycleLengths) {
        const all = [];
        for (let i = 0; i < cycleLengths.length; i++) {
            // create the list for the next sequence, e.g., (AB, ABAB, ABABAB) if sequence is a 4-cycle
            const thisSet = [];
            let thisOne = [];
            for (let j = 0; j < cycleLengths[i] - 1; j++) {
                thisOne = thisOne.concat(genSequences[i]);
                thisSet.push(thisOne);
            }
            // add to overall list
            const prevLen = all.length;
            thisSet.forEach(e => all.push(e)); // add new cycle
            for (let j = 0; j < prevLen; j++) { // add each item in new cycle to each previous element
                thisSet.forEach(el => all.push(el.concat(all[j])));
            }
        }
        return [[Flexagonator.makeFlexName('I')]].concat(all);
    }
    /** create all the sequences used to create the table, using a, b, etc. as shorthand */
    function makeGroupElements(cycleLengths) {
        const all = [];
        for (let i = 0; i < cycleLengths.length; i++) {
            // create the list for the next sequence, e.g., (b, b2, b3) if 2nd sequence is a 4-cycle
            const thisSet = [];
            for (let j = 0; j < cycleLengths[i] - 1; j++) {
                const thisChar = String.fromCharCode(97 + i); // a, b, etc.
                const thisOne = j === 0 ? thisChar : thisChar + (j + 1).toString(); // a, a2, etc.
                thisSet.push(thisOne);
            }
            // add to overall list
            const prevLen = all.length;
            thisSet.forEach(e => all.push(e));
            for (let j = 0; j < prevLen; j++) {
                thisSet.forEach(el => all.push(el + all[j]));
            }
        }
        return ['e'].concat(all);
    }
    /** make the simplest flexagon that supports all the given flexes */
    function makeMinimalFlexagon(plainFm, sequences) {
        for (let i = 0; i < sequences.length; i++) {
            // create generating sequence for entire cycle of this flex sequence
            const genSequence = sequences[i].map(f => f.getGenerator());
            let genCycle = [];
            for (let j = 0; j < sequences.length; j++) {
                genCycle = genCycle.concat(genSequence);
            }
            // apply cycle generating sequence so pat structure is added
            plainFm.applyFlexes(genCycle, false);
        }
        return plainFm.flexagon;
    }
    /** return true if any sequence changes the pat structure */
    function changesStructure(flexagon, sequences, morphs) {
        const originalPats = flexagon.pats;
        const originalDirs = flexagon.directions ? flexagon.directions.asString(false) : '';
        const fm = new Flexagonator.FlexagonManager(flexagon);
        fm.addFlexes(morphs);
        for (const sequence of sequences) {
            fm.applyFlexes(sequence, false);
            const currentPats = fm.flexagon.pats;
            if (originalPats.some((pat, i) => !pat.isEqualStructure(currentPats[i]))) {
                return true;
            }
            const currentDirs = fm.flexagon.directions ? fm.flexagon.directions.asString(false) : '';
            if (originalDirs !== currentDirs) {
                return true;
            }
        }
        return false;
    }
    /**
     * create the rows of the Cayley table for the group
     * @returns all the rows on success, or an unsupported flex sequence if the elements are incomplete
     */
    function makeRows(fm, flexElements) {
        const rows = [];
        fm.normalizeIds();
        // compute pat structure corresponding to each element
        const pats = [];
        for (const e1 of flexElements) {
            fm.applyFlexes(e1, false);
            pats.push(fm.flexagon.pats);
            fm.undoAll();
        }
        // compute each row, checking which state each composition produces
        for (const e1 of flexElements) {
            const row = [];
            for (const e2 of flexElements) {
                fm.applyFlexes(e1, false);
                fm.applyFlexes(e2, false);
                const current = fm.flexagon.pats;
                const index = pats.findIndex(ps => ps.every((p, i) => p.isEqual(current[i])));
                if (index === -1) {
                    // the required state wasn't generated by the given elements
                    const sequence = e1.map(e => e.fullName).join('') + ' ' + e2.map(e => e.fullName).join('');
                    return { reason: 'incomplete', sequences: [sequence] };
                }
                const existing = row.find(i => i === index);
                if (existing !== undefined) {
                    // row already has that element
                    const sequence = e2.map(e => e.fullName).join('');
                    return { reason: 'redundant', sequences: [sequence] };
                }
                row.push(index);
                fm.undoAll();
            }
            rows.push(row);
        }
        return rows;
    }
    /** check if ab = ba for every a & b */
    function isCommutative(rows) {
        for (let i = 1; i < rows.length; i++) {
            for (let j = i + 1; j < rows.length; j++) {
                if (rows[i][j] !== rows[j][i]) {
                    return false;
                }
            }
        }
        return true;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * get the graph of leaf-face ids that are adjacent across all the given flexagons.
     * looks at both sides of each flexagon.
     * lowest id gets connection, e.g., graph[1] contains 2 but not the other way around.
     */
    function getLeafGraph(flexagons) {
        const leafToLeaf = [];
        for (const flexagon of flexagons) {
            const visible = flexagon.getVisible();
            addFace(leafToLeaf, visible[0]); // front face
            addFace(leafToLeaf, visible[1]); // back face
        }
        return leafToLeaf;
    }
    Flexagonator.getLeafGraph = getLeafGraph;
    /** add connections between adjacent leaves on this face */
    function addFace(leafToLeaf, visible) {
        const len = visible.length;
        for (let i = 0; i < len - 1; i++) {
            addEdge(leafToLeaf, visible[i], visible[i + 1]);
        }
        // wrap from last to first
        addEdge(leafToLeaf, visible[len - 1], visible[0]);
    }
    /** add connection between two leaf-face ids, added to list for lowest id */
    function addEdge(leafToLeaf, i, j) {
        const [low, high] = Math.abs(i) < Math.abs(j) ? [i, j] : [j, i];
        if (leafToLeaf[low] === undefined) {
            leafToLeaf[low] = [high]; // first connection for the 'low' leaf-face
        }
        else if (leafToLeaf[low].find(id => id === high) === undefined) {
            leafToLeaf[low].push(high); // add to list if not already present
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * build up the graph traversed by the given sequence of flexes,
     * where flexes must be one of {P, P', ^, <, >}
     */
    function createPinchGraph(flexes) {
        const raw = createRawPinchGraph(flexes);
        if (Flexagonator.isFlexError(raw)) {
            return raw;
        }
        const points = transformAbstractPoints(raw);
        const [min, max] = getExtents(points);
        return { points: points, min: min, max: max };
    }
    Flexagonator.createPinchGraph = createPinchGraph;
    // e.g. (0,0),(1,0),(0,1) => (0,0),(1,0),(0.8,0.5)
    function transformAbstractPoints(input) {
        const yScale = Math.sqrt(3) / 2;
        return input.map(p => { return { x: p.x + 0.5 * p.y, y: p.y * yScale }; });
    }
    function getExtents(points) {
        let xmin = 0, ymin = 0, xmax = 0, ymax = 0;
        for (const point of points) {
            if (point.x < xmin)
                xmin = point.x;
            if (point.x > xmax)
                xmax = point.x;
            if (point.y < ymin)
                ymin = point.y;
            if (point.y > ymax)
                ymax = point.y;
        }
        return [{ x: xmin - 0.1, y: ymin - 0.1 }, { x: xmax + 0.1, y: ymax + 0.1 }];
    }
    /**
     * stored in a skewed coordinate system that's easy to test
     * e.g. (0,0),(1,0),(0,1) represents a regular triangle
     */
    function createRawPinchGraph(flexes) {
        const track = new TrackPinchGraph();
        const sequence = Flexagonator.parseFlexSequence(flexes);
        for (const flex of sequence) {
            switch (flex.flexName) {
                case 'P':
                    track.trackP();
                    if (!flex.shouldApply) {
                        track.trackPInverse();
                    }
                    break;
                case "P'":
                    track.trackPInverse();
                    if (!flex.shouldApply) {
                        track.trackP();
                    }
                    break;
                case '^':
                    track.trackTurnOver();
                    break;
                case '<':
                    track.trackLeft();
                    break;
                case '>':
                    track.trackRight();
                    break;
                default:
                    return { reason: Flexagonator.FlexCode.UnknownFlex, flexName: flex.flexName };
            }
        }
        return track.getResults();
    }
    Flexagonator.createRawPinchGraph = createRawPinchGraph;
    // track the path the various flexes trace over the pinch graph
    class TrackPinchGraph {
        constructor() {
            this.points = [];
            this.current = { x: 0, y: 0 };
            this.delta = { x: 1, y: 0 };
            this.isClock = true;
            this.rotates = 0;
            this.points.push(this.current);
        }
        trackP() {
            if (this.rotates % 2 !== 0) {
                // spin around the triangle
                this.delta = TrackPinchGraph.turn(this.delta, this.isClock);
            }
            else {
                // step forward, next triangle spins the opposite direction
                this.isClock = !this.isClock;
            }
            this.current = Flexagonator.addPoints(this.current, this.delta);
            this.points.push(this.current);
            this.rotates = 0;
        }
        trackPInverse() {
            if (this.rotates % 2 !== 0) {
                // spin around the triangle
                this.delta = TrackPinchGraph.turn({ x: -this.delta.x, y: -this.delta.y }, this.isClock);
                this.delta = { x: -this.delta.x, y: -this.delta.y };
            }
            else {
                // step backward, next triangle spins the opposite direction
                this.isClock = !this.isClock;
            }
            this.current = Flexagonator.addPoints(this.current, { x: -this.delta.x, y: -this.delta.y });
            this.points.push(this.current);
            this.rotates = 0;
        }
        trackTurnOver() {
            this.delta = { x: -this.delta.x, y: -this.delta.y };
        }
        trackLeft() {
            this.rotates--;
        }
        trackRight() {
            this.rotates++;
        }
        getResults() {
            return this.points;
        }
        // rotate 'delta' either clockwise our counterclockwise
        static turn(delta, isClock) {
            if (Flexagonator.pointsAreEqual(delta, { x: 1, y: 0 })) {
                return isClock ? { x: 0, y: -1 } : { x: -1, y: 1 };
            }
            else if (Flexagonator.pointsAreEqual(delta, { x: 0, y: 1 })) {
                return isClock ? { x: 1, y: -1 } : { x: -1, y: 0 };
            }
            else if (Flexagonator.pointsAreEqual(delta, { x: -1, y: 1 })) {
                return isClock ? { x: 1, y: 0 } : { x: 0, y: -1 };
            }
            else if (Flexagonator.pointsAreEqual(delta, { x: -1, y: 0 })) {
                return isClock ? { x: 0, y: 1 } : { x: 1, y: -1 };
            }
            else if (Flexagonator.pointsAreEqual(delta, { x: 0, y: -1 })) {
                return isClock ? { x: -1, y: 1 } : { x: 1, y: 0 };
            } // 1,-1
            return isClock ? { x: -1, y: 0 } : { x: 0, y: 1 };
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * describes a flex relative to the current hinge,
     * possibly rotating & turning over, and what state it leads to
     */
    class RelativeFlex {
        constructor(rights, over, flex, toState) {
            this.where = over ? -rights - 1 : rights;
            this.flex = flex;
            this.toState = toState;
        }
        getRights() {
            return this.where > 0 ? this.where : -1 - this.where;
        }
        shouldTurnOver() {
            return this.where < 0;
        }
        toString() {
            return this.toState + '(' + this.getSequence() + ')';
        }
        getSequence() {
            let str = "";
            if (this.shouldTurnOver()) {
                str += '^';
            }
            const rights = this.getRights();
            for (let i = 0; i < rights; i++) {
                str += '>';
            }
            str += this.flex;
            return str;
        }
    }
    Flexagonator.RelativeFlex = RelativeFlex;
    function relativeFlexesToString(flexes) {
        const strs = flexes.map(relFlex => relFlex.toString());
        return strs.join(', ');
    }
    Flexagonator.relativeFlexesToString = relativeFlexesToString;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * group a list of flexagons by their structure (ignoring leaf ids)
     * and return the grouped flexagon indices
     */
    function groupByStructure(flexagons) {
        const groups = [];
        const tracker = new TrackerStructure();
        flexagons.forEach((flexagon, i) => {
            const which = tracker.findMaybeAdd(flexagon);
            if (groups[which] === undefined) {
                groups[which] = [i];
            }
            else {
                groups[which].push(i);
            }
        });
        return groups;
    }
    Flexagonator.groupByStructure = groupByStructure;
    /** tracks pat structure we've seen before, ignoring leaf ids */
    class TrackerStructure {
        constructor() {
            this.states = [];
        }
        getTotalStates() {
            return this.states.length;
        }
        /**
         * if we've seen this flexagon before, return which one,
         * else add it to our list and return new index
         */
        findMaybeAdd(flexagon) {
            const state = new StructureState(flexagon);
            const i = this.getIndex(state);
            if (i !== null) {
                return i;
            }
            this.states.push(state);
            return this.states.length - 1;
        }
        /** returns which state we have, or null if we haven't seen it before */
        getIndex(state) {
            const i = this.states.findIndex(thisState => thisState.isEqualTo(state));
            return i !== -1 ? i : null;
        }
    }
    Flexagonator.TrackerStructure = TrackerStructure;
    class StructureState {
        constructor(flexagon) {
            this.stateA = flexagon.pats.map(p => p.getStructure());
            this.stateB = flexagon.pats.map(p => p.makeFlipped().getStructure()).reverse();
            if (flexagon.directions) {
                this.dirsA = flexagon.directions.asRaw();
                this.dirsB = this.dirsA.reverse();
            }
        }
        /** are the pat structures of 'this' & 'state' the same? */
        isEqualTo(state) {
            const patCount = state.stateA.length;
            for (let i = 0; i < patCount; i++) {
                if (areEqual(patCount, i, this.stateA, state.stateA, this.dirsA, state.dirsA)) {
                    return true;
                }
            }
            for (let i = 0; i < patCount; i++) {
                if (areEqual(patCount, i, this.stateB, state.stateA, this.dirsB, state.dirsA)) {
                    return true;
                }
            }
            return false;
        }
    }
    Flexagonator.StructureState = StructureState;
    /** is state1[i] = state2[start+i] for every i? */
    function areEqual(len, start, state1, state2, dirs1, dirs2) {
        for (let i = 0; i < len; i++) {
            const j = (i + start) % len;
            if (state1[i] !== state2[j]) {
                return false;
            }
            if (dirs1 && dirs2 && dirs1[i] !== dirs2[j]) {
                return false;
            }
        }
        return true;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Find the Tuckerman traverse for a given flexagon,
     * which is a flex sequence of pinches and rotates that visits every state
     * and returns to the beginning
     */
    function findTuckermanTraverse(flexagon) {
        const patCount = flexagon.getPatCount();
        const flexes = Flexagonator.makeAllFlexes(patCount);
        return findTuckermanTraverse3(flexagon, flexes['P'], flexes['>']);
    }
    Flexagonator.findTuckermanTraverse = findTuckermanTraverse;
    function findTuckermanTraverse3(flexagon, pinch, right) {
        let best = '';
        let current = '';
        const tracker = Flexagonator.Tracker.make(flexagon);
        const visited = new TrackVisited();
        while (true) {
            const afterP = pinch.apply(flexagon);
            if (!Flexagonator.isFlexError(afterP)) {
                current += 'P';
                const result = tracker.findMaybeAdd(afterP);
                if (result === null) {
                    // we found a new state, so reset our visit tracker
                    visited.reset(tracker.getTotalStates());
                    best = ''; // signal that we want to grab 'current' next time we revisit start
                }
                else {
                    // we just revisited a state
                    if (result === 0 && best === '') {
                        // if we're back at the start, that could be our traversal
                        best = current;
                    }
                    visited.add(result);
                    if (visited.allVisited()) {
                        break; // we're done
                    }
                }
                flexagon = afterP;
            }
            else {
                // couldn't pinch, so shift to next hinge
                if (current.length > 0 && current[current.length - 1] != 'P') {
                    break; // no traverse is possible
                }
                const afterShift = right.apply(flexagon);
                current += '>';
                flexagon = afterShift;
            }
        }
        return best;
    }
    Flexagonator.findTuckermanTraverse3 = findTuckermanTraverse3;
    // when we see a new state, we reset the tracker.
    // once we've seen every state since we last saw a new state,
    // we assume we've done the full traversal.
    class TrackVisited {
        constructor() {
            this.total = 0;
            this.visited = 0;
            this.which = [];
        }
        reset(count) {
            this.total = count;
            this.visited = 0;
            this.which = [];
            for (let i = 0; i < count; i++) {
                this.which.push(false);
            }
        }
        add(n) {
            if (!this.which[n]) {
                this.visited++;
                this.which[n] = true;
            }
        }
        allVisited() {
            return this.visited >= this.total;
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // dictionary of how various flexes are decomposed into atomic flexes
    Flexagonator.AtomicDecomposition = {
        // filling out the basic atomic flexes
        "<": ">'",
        Ul: "~Ur~",
        // exchange a leaf between adjacent pats or across n pats
        Xr: "Ur < Ul' >",
        Xl: "Ul < Ur' >",
        Xr3: "> Ur << Ul' >",
        Xl3: "> Ul << Ur' >",
        Xr4: "> Ur <<< Ul' >>",
        Xl4: "> Ul <<< Ur' >>",
        // pocket
        K: "Xr~^ > Ul^",
        K3a: "Xr~^ >> Ul^",
        K3b: "Xr~^ >> Ul^",
        K4: "Xr~^ >>> Ul^",
        // pinch flex & variations
        P222: "(Xr >> AwlAwl)3 ~",
        P222222: "(Xr >> AwlAwl)6 ~",
        P3333: "(Xr >>> AwlAwlAwl)4 ~",
        P3333d: "(Xr >>> AwlAwlAwl)4 ~ (Xr >>> AwlAwlAwl)4 ~",
        P333: "(Xr >>> AwlAwlAwl)3 ~",
        P444: "(Xr >>>> AwlAwlAwlAwl)3 ~",
        P444d: "(Xr >>>> AwlAwlAwlAwl)3 ~ (Xr >>>> AwlAwlAwlAwl)3 ~",
        P66d: "(Xr >>>>>> AwlAwlAwlAwlAwlAwl)2 ~ (Xr >>>>>> AwlAwlAwlAwlAwlAwl)2 ~",
        // pinch flexes made from pocket flexes
        P222k: ">>>> K ^>>> K' ^",
        P333k: ">>>>>> K3a ^>>> K3b' ^",
        // "morph-kite" flexes
        Mkf: "K > Ul' <",
        Mkb: "^Mkf^",
        Mkr: "<< Ur >>>> Xl << Ur'",
        Mkl: "^Mkr^",
        Mkfs: "> K << Xr3 > Ur'",
        Mkbs: "^Mkfs^",
        // partial shuffle (kite-to-kite), combines well with morph-kite flexes
        Sp: "> Ul << Ur > Ul' <<< Ul' >>",
        // kite-to-kite slot, combines well with morph-kite flexes
        Lkk: "> Ul Ur <<<< Ul' < Ul' >>",
        // specific to hexaflexagon
        Mkh: "Xr~ >>> Xl <<<",
        Mkt: "< Ur ^<<< Ur' <<^ Xl <<<",
        // built from morph-kite flexes
        F: "Mkf Mkb'", // K > Ul' <^> Ul < K' ^
        St: "Mkf Mkfs'", // K > Ul' < Ur << Ul >> Ur' > K' <
        Fm: "< Mkr Mkb' >", // Xr<<< Ur>>Ur' ^ > Ul < K' ^>
        S3: "< Mkr Mkl' >", // Xr<<< Ur>>Ur'< Ur>>Ur'<< Xl>>
        // these have simpler forms, but can be built from morph-kite flexes
        Tfromm: "< Mkr Mkf' >",
        Sfromm: "< Mkfs Mkb' >",
        Sfromsp: "Mkf Sp Mkb' >",
        Mkfsfromsp: "> Mkf Sp",
        Ltf: "Mkf Lkk Mkf' <",
        Lk: "Mkf Lkk Mkbs' <",
        // specific to hexaflexagon
        V: "< (Xr>>)2 Xl' AwlAwlAwlAwlAwl >>> Awl~",
        Ttf: "Mkh Mkf'",
        Lh: "Mkf Lkk Mkh'",
        Ltb: "Mkf Lkk Mkt'",
        Lbb: "Mkf Lkk >>> Mkt' <<",
        Lbf: "Mkf Lkk >>> Mkf' <<",
        // on a pentaflexagon
        L3: "(K^)3 (<)4 (K'^)3",
        // start & end //
        Tf: "Xr Xl",
        // start & end ///
        S: "K Xl' Ur' < Xl >",
        // start & end /////
        F3: ">Xl'<< Ul'<< Ur>>> Ul'<< Ur< Ul>Ur'>",
        // start & end /\/
        Tr3: "Ur << Ul' >> Ul << Ur' >",
        // start & end /\\/
        Tr4: "Xl4 Xr4",
        Bf: "Mkf' Mkb",
        Rsrf: "Mkfs' Mkf",
        // deca: ///\////\/
        Tao: ">> Ul' << Xr <<< Ur >>",
        Hat: "<<< (Ur'>>Ul< Ur'>>Ul >>)2 (<)8",
        Fet: "(Ur>>Ur' >>>)2 (<)7",
    };
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function makeAtomicFlex(name, inPattern, outPattern) {
        const input = Flexagonator.stringToAtomicPattern(inPattern);
        if (Flexagonator.isAtomicParseError(input)) {
            return input;
        }
        const output = Flexagonator.stringToAtomicPattern(outPattern);
        if (Flexagonator.isAtomicParseError(output)) {
            return output;
        }
        return new AtomicFlex(name, input, output);
    }
    Flexagonator.makeAtomicFlex = makeAtomicFlex;
    /**
     * assuming that the entire flexagon is described by input.left & input.right,
     * move the first or last pat to the opposite end of the pattern
     */
    function makeAtomicWrap(wrap) {
        const name = wrap === 'r' ? 'wrap right to left' : 'wrap left to right';
        const empty = { otherLeft: 'a', left: null, right: null, otherRight: 'b', singleLeaf: false };
        return new AtomicFlex(name, empty, empty, wrap);
    }
    Flexagonator.makeAtomicWrap = makeAtomicWrap;
    /** info about how to apply a flex that uses AtomicPattern */
    class AtomicFlex {
        constructor(name, input, output, specialWrap) {
            this.name = name;
            this.input = input;
            this.output = output;
            this.specialWrap = specialWrap;
        }
        createInverse() {
            return new AtomicFlex("inverse " + this.name, this.output, this.input);
        }
        /** apply this flex to the given input */
        apply(input) {
            if (this.specialWrap) {
                return this.handleSpecialWrap(input);
            }
            const matches = Flexagonator.matchAtomicPattern(input, this.input);
            if (Flexagonator.isAtomicPatternError(matches)) {
                return matches;
            }
            const otherLeft = this.getRemainder(this.output.otherLeft, matches.otherLeft, matches.otherRight);
            const otherRight = this.getRemainder(this.output.otherRight, matches.otherLeft, matches.otherRight);
            const moreLeft = this.getLeftoverPats(this.input.otherLeft, this.output.otherLeft, matches.patsLeft, matches.patsRight);
            const left = this.makePats(this.output.left, matches.matches, moreLeft, matches.specialDirection);
            if (Flexagonator.isFlexError(left)) {
                return { atomicPatternError: "PatMismatch" };
            }
            const moreRight = this.getLeftoverPats(this.input.otherRight, this.output.otherRight, matches.patsLeft, matches.patsRight);
            const right = this.makePats(this.output.right, matches.matches, moreRight, matches.specialDirection);
            if (Flexagonator.isFlexError(right)) {
                return { atomicPatternError: "PatMismatch" };
            }
            return { otherLeft, left, right, otherRight, singleLeaf: false };
        }
        /** make a series of ConnectedPats by filling in 'output' with what's in 'matches' + 'more' */
        makePats(output, matches, more, direction) {
            if (output === null && more === undefined) {
                return null;
            }
            const newPats = [];
            if (output) {
                for (let stack of output) {
                    const newPat = this.createPat(stack.pat.getAsLeafTree(), matches);
                    if (Flexagonator.isFlexError(newPat)) {
                        return newPat;
                    }
                    // copy across the pat's direction except in the special case where the pattern only had a single leaf,
                    // in which case we use the source pat's direction
                    newPats.push({ pat: newPat, direction: direction ? direction : stack.direction });
                }
            }
            if (more) {
                more.map(m => newPats.push(m));
            }
            return newPats;
        }
        /** create a pat given a tree of indices into a set of matched pats */
        createPat(stack, matches) {
            if (typeof (stack) === "number") {
                const i = stack;
                const pat = matches[Math.abs(i)];
                return i > 0 ? pat.makeCopy() : pat.makeFlipped();
            }
            else if (Array.isArray(stack) && stack.length === 2) {
                const a = this.createPat(stack[0], matches);
                if (Flexagonator.isFlexError(a)) {
                    return a;
                }
                const b = this.createPat(stack[1], matches);
                if (Flexagonator.isFlexError(b)) {
                    return b;
                }
                return Flexagonator.combinePats(a, b);
            }
            return { reason: Flexagonator.FlexCode.BadFlexOutput };
        }
        getLeftoverPats(pattern, output, left, right) {
            switch (output) {
                case 'a': return left ? this.checkReverse(pattern, output, left) : undefined;
                case '-a': return left ? this.checkFlipAndReverse(pattern, output, left) : undefined;
                case 'b': return right ? this.checkReverse(pattern, output, right) : undefined;
                case '-b': return right ? this.checkFlipAndReverse(pattern, output, right) : undefined;
            }
        }
        // flip over pats & possibly reverse the pat directions if needed
        checkFlipAndReverse(pattern, output, pats) {
            const flipped = Flexagonator.flipConnectedPats(pats);
            if (flipped === undefined) {
                return undefined;
            }
            return this.checkReverse(pattern, output, flipped);
        }
        // if one side is being turned over, we need to flip the pat directions
        checkReverse(pattern, output, pats) {
            if ((pattern === 'a' && output === '-a') || (pattern === '-a' && output === 'a')
                || (pattern === 'b' && output === '-b') || (pattern === '-b' && output === 'b')) {
                // if flipping but not swapping sides (e.g. a=-a), then we need to reverse all the directions
                return pats.map(p => { return { pat: p.pat, direction: (p.direction === '\\' ? '/' : '\\') }; });
            }
            return pats;
        }
        /** match reaminder output */
        getRemainder(output, left, right) {
            switch (output) {
                case 'a': return left;
                case '-a': return Flexagonator.flipRemainder(left);
                case 'b': return right;
                case '-b': return Flexagonator.flipRemainder(right);
            }
        }
        /**
         * assuming that the entire flexagon is described by input.left & input.right,
         * move the first or last pat to the opposite end of the pattern
         */
        handleSpecialWrap(input) {
            if (input.left === null && input.right === null) {
                return input;
            }
            const turnOver = this.shouldTurnOver(input);
            if (this.specialWrap === 'l') {
                // check if we need to move the current hinge from 'left' to 'right'
                if (!input.left && input.right) {
                    // TODO: handle the 'turnOver' case
                    const left = input.right.slice(1).reverse();
                    const right = [input.right[0]];
                    return Object.assign(Object.assign({}, input), { left, right });
                }
                const item = input.left !== null ? input.left[input.left.length - 1] : input.right[0];
                const toWrap = turnOver ? this.turnOver(item) : item;
                const left = input.left !== null ? input.left.slice(0, input.left.length - 1) : null;
                const right = input.right !== null ? input.right.concat(toWrap) : [toWrap];
                return Object.assign(Object.assign({}, input), { left, right });
            }
            else if (this.specialWrap === 'r') {
                // check if we need to move the current hinge from 'right' to 'left'
                if (input.left && !input.right) {
                    // TODO: handle the 'turnOver' case
                    const left = [input.left[0]];
                    const right = input.left.slice(1).reverse();
                    return Object.assign(Object.assign({}, input), { left, right });
                }
                const item = input.right !== null ? input.right[input.right.length - 1] : input.left[0];
                const toWrap = turnOver ? this.turnOver(item) : item;
                const left = input.left !== null ? input.left.concat(toWrap) : [toWrap];
                const right = input.right !== null ? input.right.slice(0, input.right.length - 1) : null;
                return Object.assign(Object.assign({}, input), { left, right });
            }
            return input;
        }
        shouldTurnOver(input) {
            const aFlipped = input.otherLeft.startsWith('-');
            const bFlipped = input.otherRight.startsWith('-');
            return (aFlipped && !bFlipped) || (!aFlipped && bFlipped);
        }
        turnOver(pat) {
            return { pat: pat.pat.makeFlipped(), direction: pat.direction === '/' ? '\\' : '/' };
        }
    }
    Flexagonator.AtomicFlex = AtomicFlex;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** get just the pats in the pattern */
    function getAtomicPatternPats(pattern) {
        const left = pattern.left == null ? [] : pattern.left.map(cp => cp.pat).reverse();
        const right = pattern.right == null ? [] : pattern.right.map(cp => cp.pat);
        return left.concat(right);
    }
    Flexagonator.getAtomicPatternPats = getAtomicPatternPats;
    /** get just the directions in the pattern */
    function getAtomicPatternDirections(pattern) {
        const left = pattern.left == null ? [] : pattern.left.map(cp => cp.direction).reverse();
        const right = pattern.right == null ? [] : pattern.right.map(cp => cp.direction);
        return left.concat(right);
    }
    Flexagonator.getAtomicPatternDirections = getAtomicPatternDirections;
    function connectedPatToString(pat) {
        return pat.pat.getString() + ' ' + pat.direction;
    }
    Flexagonator.connectedPatToString = connectedPatToString;
    function getPatsCount(chunk) {
        return (chunk === null || chunk === undefined) ? 0 : chunk.length;
    }
    Flexagonator.getPatsCount = getPatsCount;
    function getLeafCount(pats) {
        if (pats === null) {
            return 0;
        }
        return pats.reduce((total, pat) => total + pat.pat.getLeafCount(), 0);
    }
    Flexagonator.getLeafCount = getLeafCount;
    function flipRemainder(r) {
        return (r[0] === '-' ? r[1] : '-' + r);
    }
    Flexagonator.flipRemainder = flipRemainder;
    function flipConnectedPats(cp) {
        if (cp === undefined) {
            return undefined;
        }
        return cp.map(p => { return { pat: p.pat.makeFlipped(), direction: p.direction }; });
    }
    Flexagonator.flipConnectedPats = flipConnectedPats;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function isAtomicPatternError(result) {
        return (result !== null) && result.atomicPatternError !== undefined;
    }
    Flexagonator.isAtomicPatternError = isAtomicPatternError;
    function atomicPatternErrorToString(error) {
        let output = error.atomicPatternError;
        if (error.expectedConnected) {
            output += ', expected connected: "' + Flexagonator.connectedPatToString(error.expectedConnected) + '"';
        }
        if (error.actualConnected) {
            output += ', actual connected: "' + Flexagonator.connectedPatToString(error.actualConnected) + '"';
        }
        if (error.expectedPats) {
            output += ', expected pats: ' + JSON.stringify(error.expectedPats);
        }
        if (error.actualPats) {
            output += ', actual pats: ' + JSON.stringify(error.actualPats);
        }
        return output;
    }
    Flexagonator.atomicPatternErrorToString = atomicPatternErrorToString;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * turn an AtomicPattern into a string, e.g. "a [1,2] / # 3 \ -b"
     */
    function atomicPatternToString(pattern) {
        const reversed = reverseConnected(pattern.left);
        const leftPats = reversed === null ? '' : reversed.map(p => p.pat.getString() + ' ' + p.direction).join(' ');
        const rightPats = pattern.right === null ? '' : pattern.right.map(p => p.pat.getString() + ' ' + p.direction).join(' ');
        const left = pattern.left === null ? pattern.otherLeft : pattern.otherLeft + ' ' + leftPats;
        const right = pattern.right === null ? pattern.otherRight : rightPats + ' ' + pattern.otherRight;
        return [left, '#', right].join(' ');
    }
    Flexagonator.atomicPatternToString = atomicPatternToString;
    /**
     * parse a string to create an AtomicPattern, e.g. "a [1,2] / # 3 \ -b"
     */
    function stringToAtomicPattern(s) {
        const pieces = s.split('#');
        if (pieces.length !== 2) {
            return { atomicParseCode: "NeedOneHinge", input: s };
        }
        // break into the appropriate pieces
        const left = getLeft(pieces[0].trim());
        if (isAtomicParseError(left)) {
            return { atomicParseCode: left.atomicParseCode, input: s, context: left.input };
        }
        const right = getRight(pieces[1].trim());
        if (isAtomicParseError(right)) {
            return { atomicParseCode: right.atomicParseCode, input: s, context: right.input };
        }
        const ignoreDirection = (Flexagonator.getLeafCount(left[1]) + Flexagonator.getLeafCount(right[1])) <= 1;
        return { otherLeft: left[0], left: left[1], right: right[1], otherRight: right[0], singleLeaf: ignoreDirection };
    }
    Flexagonator.stringToAtomicPattern = stringToAtomicPattern;
    function isAtomicParseError(result) {
        return (result !== null) && result.atomicParseCode !== undefined;
    }
    Flexagonator.isAtomicParseError = isAtomicParseError;
    // get otherLeft & left
    function getLeft(s) {
        // figure out otherLeft
        let otherLeft;
        if (s.startsWith('a') || s.startsWith('b')) {
            otherLeft = s[0];
            s = s.substring(2);
        }
        else if (s.startsWith('-a') || s.startsWith('-b')) {
            otherLeft = s.substring(0, 2);
            s = s.substring(3);
        }
        else {
            return { atomicParseCode: "MissingOtherLeft", input: s };
        }
        const left = parseConnectedPats(s);
        if (isAtomicParseError(left)) {
            return left;
        }
        const reversed = reverseConnected(left);
        return [otherLeft, reversed];
    }
    // get otherRight & right
    function getRight(s) {
        // figure out otherRight
        let otherRight;
        const len = s.length;
        if (s.endsWith('-a') || s.endsWith('-b')) {
            otherRight = s.substring(len - 2);
            s = s.substring(0, len - 3);
        }
        else if (s.endsWith('a') || s.endsWith('b')) {
            otherRight = s.substring(len - 1);
            s = s.substring(0, len - 2);
        }
        else {
            return { atomicParseCode: "MissingOtherRight", input: s };
        }
        const right = parseConnectedPats(s);
        if (isAtomicParseError(right)) {
            return right;
        }
        return [otherRight, right];
    }
    function parseConnectedPats(s) {
        if (s.length === 0) {
            return null;
        }
        if (s === '1') {
            return [{ pat: Flexagonator.makePat(1), direction: '\\' }];
        }
        const pieces = breakIntoPieces(s);
        if (isAtomicParseError(pieces)) {
            return pieces;
        }
        return piecesToPats(pieces);
    }
    // "[1,-2] \ 3 /" into ["[1,-2]", "\", "3", "/"]
    function breakIntoPieces(s) {
        const p = s.split(/([0-9-\[\]\,\s]+)(\\|\/)/g);
        const p2 = p.filter(e => e != '').map(e => e.trim());
        if (p2.length % 2 === 1) {
            return { atomicParseCode: "NeedMatchedPatsAndDirections", input: s };
        }
        return p2;
    }
    function piecesToPats(pieces) {
        const pats = [];
        for (let i = 0; i < pieces.length; i += 2) {
            const leaftree = parseLeafTree(pieces[i]);
            if (isAtomicParseError(leaftree)) {
                return leaftree;
            }
            const pat = Flexagonator.makePat(leaftree);
            if (Flexagonator.isTreeError(pat)) {
                return { atomicParseCode: "CantParsePatStructure", input: pieces[i] };
            }
            const current = { pat, direction: pieces[i + 1] };
            pats.push(current);
        }
        return pats;
    }
    function parseLeafTree(s) {
        try {
            return JSON.parse(s);
        }
        catch (e) {
            return { atomicParseCode: "CantParsePatStructure", input: s };
        }
    }
    function reverseConnected(pats) {
        return pats === null ? null : pats.map((_, i) => pats[pats.length - i - 1]);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * create the basic atomic flexes that can be used to build all other flexes
     * @param plusSubFlexes default: just <^UrUl; 'blocks': also include flexes built up from the simplest flexes, e.g. >, Xr, Xl, K; 'all': all flexes
     */
    function makeAtomicFlexes(plus) {
        const flexes = {};
        addBasicFlexes(flexes);
        if (plus) {
            addBuildingBlocks(flexes);
        }
        if (plus === 'all') {
            addFullFlexes(flexes);
        }
        // add all the inverses
        for (const flex of Object.keys(flexes)) {
            flexes[flex + "'"] = flexes[flex].createInverse();
        }
        return flexes;
    }
    Flexagonator.makeAtomicFlexes = makeAtomicFlexes;
    // all flexes are made up of these basic flexes
    function addBasicFlexes(flexes) {
        flexes[">"] = Flexagonator.makeAtomicFlex("shift right", "a # 1 b", "a 1 # b");
        flexes["^"] = Flexagonator.makeAtomicFlex("turn over", "a # b", "-b # -a");
        flexes["~"] = Flexagonator.makeAtomicFlex("change direction", "a # b", "-a # -b");
        flexes["Ur"] = Flexagonator.makeAtomicFlex("unfold right", "a # [-2,1] / b", "a # 1 \\ 2 / -b");
        // special flexes that only work if 'a' & 'b' are actually empty,
        // in other words, the entire pat structure is defined by the pattern
        flexes["Awl"] = Flexagonator.makeAtomicWrap('l');
        flexes["Awr"] = Flexagonator.makeAtomicWrap('r');
    }
    // create some larger pieces that can more easily be combined into "full" flexes
    function addBuildingBlocks(flexes) {
        // < = >'
        flexes["<"] = Flexagonator.makeAtomicFlex("shift left", "a 1 # b", "a # 1 b");
        // Ul = ~Ur~
        flexes["Ul"] = Flexagonator.makeAtomicFlex("unfold left", "a # [1,-2] \\ b", "a # 1 / 2 \\ -b");
        flexes["Xr"] = Flexagonator.makeAtomicFlex("exchange right", "a 1 / # [-3,2] / b", "a [1,-2] \\ # -3 \\ b");
        flexes["Xl"] = Flexagonator.makeAtomicFlex("exchange left", "a 1 \\ # [2,-3] \\ b", "a [-2,1] / # -3 / b");
        flexes["Xr3"] = Flexagonator.makeAtomicFlex("exchange right across 3 pats", "a 1 / # 2 \\ [-4,3] / b", "a [1,-2] \\ # -3 / -4 \\ b");
        flexes["Xl3"] = Flexagonator.makeAtomicFlex("exchange left across 3 pats", "a 1 \\ # 2 / [3,-4] \\ b", "a [-2,1] / # -3 \\ -4 / b");
        flexes["Xr4"] = Flexagonator.makeAtomicFlex("exchange right across 4 pats", "a 1 / 2 \\ # 3 \\ [-5,4] / b", "a [1,-2] \\ -3 / # -4 / -5 \\ b");
        flexes["Xl4"] = Flexagonator.makeAtomicFlex("exchange left across 4 pats", "a 1 \\ 2 / # 3 / [4,-5] \\ b", "a [-2,1] / -3 \\ # -4 \\ -5 / b");
        flexes["K"] = Flexagonator.makeAtomicFlex("pocket", "a [-2,1] / -3 / # [5,-4] / b", "a 1 \\ 2 / # [-4,3] / -5 / -b");
        flexes["K3a"] = Flexagonator.makeAtomicFlex("pocket3", "a [-2,1] / -3 / -4 / # [6,-5] / b", "a 1 \\ 2 / # 3 \\ [-5,4] / -6 / -b");
        flexes["K3b"] = Flexagonator.makeAtomicFlex("pocket3", "a [-2,1] / -3 \\ -4 / # [6,-5] / b", "a 1 \\ 2 / # 3 / [-5,4] / -6 / -b");
        flexes["K4"] = Flexagonator.makeAtomicFlex("pocket4", "a [-2,1] / -3 / -4 / -5 / # [7,-6] / b", "a 1 \\ 2 / # 3 \\ 4 \\ [-6,5] / -7 / -b");
        flexes["Mkf"] = Flexagonator.makeAtomicFlex("morph-kite: fold forward", "a [-2,1] / -3 / # [5,-4] / 6 / b", "a 1 \\ 2 / # [-4,3] / [-5,6] \\ b");
        flexes["Mkb"] = Flexagonator.makeAtomicFlex("morph-kite: fold back", "a 1 / [-3,2] / # -4 / [6,-5] / b", "a [1,-2] \\ [4,-3] / # 5 / 6 \\ b");
        flexes["Mkr"] = Flexagonator.makeAtomicFlex("morph-kite: fold right", "a [-2,1] / -3 / # -4 / [6,-5] / b", "a 1 \\ 2 / # [[-4,5],3] / 6 \\ b");
        flexes["Mkl"] = Flexagonator.makeAtomicFlex("morph-kite: fold left", "a [-2,1] / -3 / # -4 / [6,-5] / b", "a 1 \\ [4,[2,-3]] / # 5 / 6 \\ b");
        flexes["Mkfs"] = Flexagonator.makeAtomicFlex("morph-kite: front shuffle", "a 1 / [[-3,4],2] / # 5 / [-7,6] / b", "a [1,-2] \\ -3 / # [[5,-6],-4] / -7 \\ b");
        flexes["Mkbs"] = Flexagonator.makeAtomicFlex("morph-kite: back shuffle", "a [-2, 1] / -3 / # [-6,[-4,5]] / -7 / b", "a 1 \\ [4,[2,-3]] / # 5 / [6,-7] \\ b");
        flexes["Sp"] = Flexagonator.makeAtomicFlex("partial shuffle", "a 1 / 2 \\ [-4,3] / # -5 / [-6,7] \\ b", "a [1,-2] \\ -3 / # [5,-4] / 6 \\ 7 / b");
        flexes["Lkk"] = Flexagonator.makeAtomicFlex("kite-to-kite slot", "a 1 / 2 / 3 \\ 4 / # 5 / [[-7,6],8] \\ b", "a [1,[3,-2]] \\ 4 / # 5 / 6 \\ 7 / 8 / b");
    }
    // create flexes that start and end with the same pat directions
    function addFullFlexes(flexes) {
        flexes["P222"] = Flexagonator.makeAtomicFlex("pinch on hexa", "a 1 / # [-3,2] / -4 / [6,-5] / 7 / [-9,8] / b", "-a [2,-1] / # 3 / [-5,4] / -6 / [8,-7] / 9 / -b");
        flexes["V"] = Flexagonator.makeAtomicFlex("v-flex on hexa", "a 7 / [-9,8] / # 1 / [-3,2] / [5,-4] / 6 / b", "-a [8,-7] / 9 / # [2,-1] / 3 / 4 / [-6,5] / -b");
        // from // to //
        flexes["Tf"] = Flexagonator.makeAtomicFlex("forced tuck", "a 1 / # [[-3,4],2] / b", "a [3,[1,-2]] / # 4 / b");
        // from /// to ///
        flexes["S"] = Flexagonator.makeAtomicFlex("pyramid shuffle", "a [[[3,-2],-4],1] / -5 / # [7,-6] / b", "a [-2,1] / -3 / # [7,[-4,[-6,5]]] / b");
        // from //// to ////
        flexes["F"] = Flexagonator.makeAtomicFlex("flip", "a [[3,-4],[1,-2]] / -5 / # [7,-6] / 8 / b", "a 1 / [-3,2] / # -4 / [[-7,8],[-5,6]] / b");
        flexes["St"] = Flexagonator.makeAtomicFlex("silver tetra", "a [3,[1,-2]] / 4 / # [7,[5,-6]] / 8 / b", "a 1 / [[-3,4],2] / # 5 / [[-7,8],6] / b");
        flexes["S3"] = Flexagonator.makeAtomicFlex("pyramid shuffle 3", "a [[[3,-2],-4],1] / -5 / -6 / # [8,-7] / b", "a [-2,1] / -3 / -4 / # [8,[-5,[-7,6]]] / b");
        flexes["Fm"] = Flexagonator.makeAtomicFlex("mobius flip", "a [[3,-4],[1,-2]] / -5 / -6 / # [8,-7] / b", "a 1 / [-3,2] / -4 / # [8,[-5,[-7,6]]] / b");
        flexes["Tfromm"] = Flexagonator.makeAtomicFlex("tuck using morph flexes", "a [-2,1] / -3 / -4 / # [[6,-7],-5] / b", "a [-2,1] / -3 / [-6,[-4,5]] / # -7 / b");
        flexes["Sfromm"] = Flexagonator.makeAtomicFlex("pyramid shuffle using morph flexes", "a 1 / [[[4,-3],-5],2] / -6 / # [8,-7] / b", "a 1 / [-3,2] / -4 / # [8,[-5,[-7,6]]] / b");
        // from ///// to /////
        flexes["F3"] = Flexagonator.makeAtomicFlex("flip3", "a [[3,-4],[1,-2]] / -5 / -6 / # [8,-7] / 9 / b", "a 1 / [-3,2] / # -4 / -5 / [[-8,9],[-6,7]] / b");
        // from \\ to \\
        flexes["Tr2"] = Flexagonator.makeAtomicFlex("transfer2", "a 1 \\ # [2,[4,-3]] \\ b", "a [[-2,1],3] \\ # 4 \\ b");
        // from /\/ to /\/
        flexes["Tr3"] = Flexagonator.makeAtomicFlex("transfer3", "a 1 / 2 \\ # [[-4, 5], 3] / b", "a [3,[1,-2]] / # 4 \\ 5 / b");
        // from /\\/ to /\\/
        flexes["Tr4"] = Flexagonator.makeAtomicFlex("transfer4", "a 1 \\ 2 / # 3 / [4,[6,-5]] \\ b", "a [[-2,1],3] \\ 4 / # 5 / 6 \\ b");
        flexes["Bf"] = Flexagonator.makeAtomicFlex("backflip", // = Mkf' Mkb
        "a 1 \\ 2 / # [5,[3,-4]] / [6,[8,-7]] \\ b", "a [[-2,1],3] \\ [[-5,6],4] / # 7 / 8 \\ b");
        flexes["Rsrf"] = Flexagonator.makeAtomicFlex("reverse Mkfs' Mkf", "a [[-2,1],3] \\ 4 / # [[[7,-6],-8],5] / -9 \\ b", "a 1 \\ 2 / # [-6,[3,[5,-4]]] / [-7,[-9,8]] \\ b");
        // deca: ///\////\/
        flexes["Tao"] = Flexagonator.makeAtomicFlex("three-and-open", "a [10,-9] / 11 \\ 12 / # [-2,1] / -3 / -4 / -5 \\ -6 / -7 / -8 / b", "a -9 \\ -10 / # -11 / [1,-12] / 2 / 3 \\ [-5,4] / -6 / -7 / -8 / b");
        flexes["Hat"] = Flexagonator.makeAtomicFlex("half-and-twist", "a -11 \\ -12 / -13 / # [1,-14] / [-3,2] / -4 \\ -5 / -6 / [8, -7] / [-10, 9] / b", "a [12,-11] / [-14,13] / # -1 / -2 / -3 \\ [5,-4] / [-7,6] / -8 / -9 / -10 \\ b");
        flexes["Fet"] = Flexagonator.makeAtomicFlex("figure-eight", "a # [2,-1] / 3 / 4 \\ 5 / 6 / [-8,7] / -9 / -10 \\ -11 / -12 / b", "a -1 \\ -2 / [4,-3] / # 5 / 6 / 7 \\ 8 / [-10,9] / -11 / -12 / b");
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * create local flexes that transform 4 pats
     * from an arrangement where all pats meet in the middle (////)
     * to an arrangement where there's a "kite" sticking off (\//\).
     */
    function makeMorphFlexes(patCount) {
        let flexes = {};
        if (patCount < 6) {
            return flexes;
        }
        // flexes from main position to kite position: //// -> \//\
        flexes["Mkb"] = Flexagonator.createLocalFlex("morph-kite: fold back", patCount - 4, 7, [1, [-3, 2]], /**/ [-4, [6, -5]], // 1 2 1 2
        [[1, -2], [4, -3]], /**/ [5, 6], // 2 2 1 1
        "//", "//", "|/", "/|", Flexagonator.FlexRotation.BCA);
        flexes["Mkf"] = Flexagonator.createLocalFlex("morph-kite: fold forward", patCount - 4, 7, [[-2, 1], -3], /**/ [[5, -4], 6], // 2 1 2 1
        [1, 2], /**/ [[-4, 3], [-5, 6]], // 1 1 2 2
        "//", "//", "|/", "/|", Flexagonator.FlexRotation.BCA);
        flexes["Mkl"] = Flexagonator.createLocalFlex("morph-kite: fold left back", patCount - 4, 7, [[-2, 1], -3], /**/ [-4, [6, -5]], // 2 1 1 2
        [1, [4, [2, -3]]], /**/ [5, 6], // 1 -3 1 1
        "//", "//", "|/", "/|", Flexagonator.FlexRotation.BCA);
        flexes["Mkr"] = Flexagonator.createLocalFlex("morph-kite: fold right forward", patCount - 4, 7, [[-2, 1], -3], /**/ [-4, [6, -5]], // 2 1 1 2
        [1, 2], /**/ [[[-4, 5], 3], 6], // 1 1 3 1
        "//", "//", "|/", "/|", Flexagonator.FlexRotation.BCA);
        flexes["Mkfs"] = Flexagonator.createLocalFlex("morph-kite: front shuffle", patCount - 4, 8, [1, [[-3, 4], 2]], /**/ [5, [-7, 6]], // 1 3 1 2
        [[1, -2], -3], /**/ [[[5, -6], -4], -7], // 2 1 3 1
        "//", "//", "|/", "/|", Flexagonator.FlexRotation.BCA);
        flexes["Mkbs"] = Flexagonator.createLocalFlex("morph-kite: back shuffle", patCount - 4, 8, [[-2, 1], -3], /**/ [[-6, [-4, 5]], -7], // 2 1 -3 1
        [1, [4, [2, -3]]], /**/ [5, [6, -7]], // 1 -3 1 2
        "//", "//", "|/", "/|", Flexagonator.FlexRotation.BCA);
        // only works on a hexa
        if (patCount === 6) {
            flexes["Mkh"] = Flexagonator.makeFlex("morph-kite: fold in half", [[-2, 1], -3, -4, [6, -5], 7, 8], [2, 3, [-5, 4], -6, -7, [1, -8]], Flexagonator.FlexRotation.BAC, "//////", "/|//|/");
            flexes["Mkt"] = Flexagonator.makeFlex("morph-kite: partial tuck", [2, 3, 4, [-6, 5], -7, [1, -8]], [[-2, 1], -3, [5, -4], 6, 7, 8], Flexagonator.FlexRotation.BAC, "//////", "/|//|/");
        }
        // only works on a (////\)2 deca
        if (patCount === 10) {
            flexes["Tao"] = Flexagonator.makeFlex("three-and-open", [[-2, 1], -3, -4, -5, -6, -7, -8, [10, -9], 11, 12], [-11, [1, -12], 2, 3, [-5, 4], -6, -7, -8, -9, -10], Flexagonator.FlexRotation.BAC, "///|////|/", "///|////|/");
            flexes["Hat"] = Flexagonator.makeFlex("half-and-twist", [[1, -14], [-3, 2], -4, -5, -6, [8, -7], [-10, 9], -11, -12, -13], [-1, -2, -3, [5, -4], [-7, 6], -8, -9, -10, [12, -11], [-14, 13]], Flexagonator.FlexRotation.BAC, "//|////|//", "//|////|//");
            flexes["Fet"] = Flexagonator.makeFlex("figure-eight", [[2, -1], 3, 4, 5, 6, [-8, 7], -9, -10, -11, -12], [5, 6, 7, 8, [-10, 9], -11, -12, -1, -2, [4, -3]], Flexagonator.FlexRotation.BAC, "//|////|//", "//|////|//");
        }
        // only works on a dodeca
        if (patCount === 12) {
            flexes["Rhm"] = Flexagonator.makeFlex("rhombic morph", [[-2, 1], -3, -4, -5, [7, -6], 8, [-10, 9], -11, -12, -13, [15, -14], 16], [-1, [3, -2], 4, 5, 6, [-8, 7], -9, [11, -10], 12, 13, 14, [-16, 15]], Flexagonator.FlexRotation.CBA, "////////////", "//||////||//");
            flexes["Ds"] = Flexagonator.makeFlex("double slide", [[-2, 1], -3, -4, [6, -5], 7, 8, [-10, 9], -11, -12, [14, -13], 15, 16], [1, 2, [-4, 3], -5, -6, [8, -7], 9, 10, [-12, 11], -13, -14, [16, -15]], Flexagonator.FlexRotation.None, "//|//|//|//|", "|//|//|//|//");
            flexes["Tu"] = Flexagonator.makeFlex("turn", [1, 2, [-4, 3], -5, -6, -7, -8, -9, [11, -10], 12, 13, 14], [-13, [1, -14], 2, 3, 4, 5, 6, [-8, 7], -9, -10, -11, -12], Flexagonator.FlexRotation.CBA, "|//|//|//|//", "|//|//|//|//");
        }
        // flexes that go between kite positions
        flexes["Sp"] = Flexagonator.createLocalFlex("partial shuffle", patCount - 5, 8, [1, 2, [-4, 3]], /**/ [-5, [-6, 7]], [[1, -2], -3], /**/ [[5, -4], 6, 7], "/|/", "/|", "|/", "/|/", Flexagonator.FlexRotation.BAC);
        flexes["Ss"] = Flexagonator.createLocalFlex("single slide", patCount - 6, 9, [[-2, 1], -3, -4], /**/ [[6, -5], 7, 8], [1, 2, [-4, 3]], /**/ [-5, -6, [8, -7]], "//|", "//|", "|//", "|//");
        flexes["Lkk"] = Flexagonator.createLocalFlex("kite-to-kite slot", patCount - 6, 9, [1, 2, 3, 4], /**/ [5, [[-7, 6], 8]], [[1, [3, -2]], 4], /**/ [5, 6, 7, 8], "//|/", "/|", "|/", "/|//");
        // backflip = Mkf' Mkb
        flexes["Bf"] = Flexagonator.createLocalFlex("backflip", patCount - 4, 9, [1, 2], /**/ [[5, [3, -4]], [6, [8, -7]]], [[[-2, 1], 3], [[-5, 6], 4]], /**/ [7, 8], "|/", "/|", "|/", "/|"); // \/#/\
        // transfer flexes
        flexes["Tr2"] = Flexagonator.createLocalFlex("transfer 2", patCount - 2, 5, [1], /**/ [[2, [4, -3]]], [[[-2, 1], 3]], /**/ [4], "|", "|", "|", "|"); // \#\
        flexes["Tr3"] = Flexagonator.createLocalFlex("transfer 3", patCount - 3, 6, [1, 2], /**/ [[[-4, 5], 3]], [[3, [1, -2]]], /**/ [4, 5], "/|", "/", "/|", "/", Flexagonator.FlexRotation.Left, -1); // /\#/ -> /#\/
        flexes["Tr4"] = Flexagonator.createLocalFlex("transfer 4", patCount - 4, 7, [1, 2], /**/ [3, [4, [6, -5]]], [[[-2, 1], 3], 4], /**/ [5, 6], "|/", "/|", "|/", "/|"); // \/#/\
        // add all the inverses
        for (const flex of Object.keys(flexes)) {
            flexes[flex + "'"] = flexes[flex].createInverse();
        }
        return flexes;
    }
    Flexagonator.makeMorphFlexes = makeMorphFlexes;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * match an AtomicPattern against an input pattern, extracting out the matches
     */
    function matchAtomicPattern(input, pattern) {
        if (Flexagonator.getPatsCount(input.left) < Flexagonator.getPatsCount(pattern.left) || Flexagonator.getPatsCount(input.right) < Flexagonator.getPatsCount(pattern.right)) {
            return { atomicPatternError: "NotEnoughPats" };
        }
        const result = findMatches(input.left, input.right, pattern.left, pattern.right, pattern.singleLeaf);
        if (Flexagonator.isAtomicPatternError(result)) {
            return result;
        }
        const [matches, specialDirection] = result;
        const leftover = findLeftovers(input, pattern);
        if (Flexagonator.isAtomicPatternError(leftover)) {
            return leftover;
        }
        return Object.assign(Object.assign({}, leftover), { specialDirection, matches });
    }
    Flexagonator.matchAtomicPattern = matchAtomicPattern;
    /** find matches on left side & right side, then combine results */
    function findMatches(inLeft, inRight, patternLeft, patternRight, singleLeaf) {
        let leftMatches = [];
        let direction;
        if (inLeft !== null && patternLeft !== null) {
            const matches = matchOneSide(inLeft, patternLeft, singleLeaf);
            if (Flexagonator.isAtomicPatternError(matches)) {
                return matches;
            }
            leftMatches = matches;
            if (singleLeaf) {
                direction = inLeft[0].direction;
            }
        }
        let rightMatches = [];
        if (inRight !== null && patternRight !== null) {
            const matches = matchOneSide(inRight, patternRight, singleLeaf);
            if (Flexagonator.isAtomicPatternError(matches)) {
                return matches;
            }
            rightMatches = matches;
            if (singleLeaf) {
                direction = inRight[0].direction;
            }
        }
        return [combineMatches([leftMatches, rightMatches]), direction];
    }
    /** find matches from a list of pats */
    function matchOneSide(inPats, patternPats, ignoreDirection) {
        const all = patternPats.map((p, i) => matchOnePat(inPats[i], p, ignoreDirection));
        // any errors?
        const errors = all.filter(e => Flexagonator.isAtomicPatternError(e));
        if (errors.length > 0) {
            return errors[0];
        }
        // we only have Pat[]'s, which we need to merge
        const matches = combineMatches(all);
        return matches;
    }
    /** extract out the matches in a single pat */
    function matchOnePat(input, pattern, ignoreDirection) {
        if (input.direction !== pattern.direction && !ignoreDirection) {
            return { atomicPatternError: "DirectionMismatch", expectedConnected: pattern, actualConnected: input };
        }
        const matches = input.pat.matchPattern(pattern.pat.getAsLeafTree());
        if (Flexagonator.isPatternError(matches)) {
            return { atomicPatternError: "PatMismatch", expectedConnected: pattern, actualConnected: input, expectedPats: matches.expected, actualPats: matches.actual };
        }
        return matches;
    }
    function combineMatches(all) {
        const combined = [];
        all.map(pats => pats.map((p, i) => combined[i] = p));
        return combined;
    }
    /** collect all the leftovers not matched by the patterns, flip & swap as necessary */
    function findLeftovers(input, pattern) {
        const [iol, ior] = [input.otherLeft, input.otherRight];
        const [pol, por] = [pattern.otherLeft, pattern.otherRight];
        const ipl = getLeftoverPats(input.left, pattern.left);
        const ipr = getLeftoverPats(input.right, pattern.right);
        let otherLeft = 'a', otherRight = 'a';
        let patsLeft = undefined, patsRight = undefined;
        if (pol === 'a' || pol === '-a') {
            // left & right match between input & pattern
            otherLeft = pol === 'a' ? iol : Flexagonator.flipRemainder(iol);
            patsLeft = pol === 'a' ? ipl : Flexagonator.flipConnectedPats(ipl);
            otherRight = por === 'b' ? ior : Flexagonator.flipRemainder(ior);
            patsRight = por === 'b' ? ipr : Flexagonator.flipConnectedPats(ipr);
        }
        else {
            // swap left & right
            otherLeft = pol === 'b' ? ior : Flexagonator.flipRemainder(ior);
            patsLeft = pol === 'b' ? ipr : Flexagonator.flipConnectedPats(ipr);
            otherRight = por === 'a' ? iol : Flexagonator.flipRemainder(iol);
            patsRight = por === 'a' ? ipl : Flexagonator.flipConnectedPats(ipl);
        }
        return { matches: [], otherLeft, patsLeft, otherRight, patsRight };
    }
    function getLeftoverPats(input, pattern) {
        if (pattern === null) {
            return input === null ? undefined : input;
        }
        if (input === null || input.length <= pattern.length) {
            return undefined;
        }
        return input.slice(pattern.length);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // turn a mouse event into a script if the mouse was over a button
    function getScriptItem(event, canvas, buttons) {
        const output = canvas instanceof HTMLCanvasElement ? canvas : document.getElementById(canvas);
        const rect = output.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return buttons.findButton(x, y);
    }
    Flexagonator.getScriptItem = getScriptItem;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * for every hinge of a flexagon, figure out which flexes can be performed,
     * if 'generate', then it allows every flex in generate-mode, e.g. 'P*'
     */
    function createFlexRegions(flexagon, allFlexes, flexesToSearch, flip, generate, polygon, hinges) {
        const regions = [];
        const corners = polygon.getCorners();
        const genFlexes = generate ? getGenFlexes(flexesToSearch) : [];
        let prefix = "", postfix = "";
        for (let i = 0; i < flexagon.getPatCount(); i++) {
            const flexes = generate
                ? genFlexes
                : Flexagonator.checkForFlexesAtHinge(flexagon, allFlexes, flexesToSearch, flip, i);
            const x = hinges ? (hinges[i].a.x + hinges[i].b.x) / 2 : corners[i * 2];
            const y = hinges ? (hinges[i].a.y + hinges[i].b.y) / 2 : corners[i * 2 + 1];
            const region = {
                flexes: flexes,
                prefix: prefix,
                postfix: postfix,
                corner: { x: x, y: y },
                isOnLeft: x < polygon.xCenter,
                isOnTop: y < polygon.yCenter,
            };
            regions.push(region);
            prefix += ">";
            postfix += "<";
        }
        return regions;
    }
    Flexagonator.createFlexRegions = createFlexRegions;
    function getGenFlexes(flexes) {
        return Object.keys(flexes).map(name => name + '*');
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** unfold an atomic pattern and draw it */
    function drawAtomicPatternUnfolded(canvas, pattern, angleInfo, options) {
        const pats = Flexagonator.getAtomicPatternPats(pattern);
        const flexagon = new Flexagonator.Flexagon(pats);
        const patternDirections = Flexagonator.getAtomicPatternDirections(pattern);
        const directions = patternDirections.map(d => d === '/');
        const leafProps = new Flexagonator.PropertiesForLeaves();
        const objects = { flexagon, angleInfo, directions, leafProps };
        Flexagonator.drawUnfoldedObjects(canvas, objects, options);
    }
    Flexagonator.drawAtomicPatternUnfolded = drawAtomicPatternUnfolded;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** limited support for drawing non-triangular flexagons by name, e.g. 'hexagonal kite hexaflexagon' */
    function drawByName(target, name) {
        const paint = Flexagonator.newPaint(target);
        if (paint === null) {
            return;
        }
        const [width, height] = paint.getSize();
        const center = { x: width / 2, y: height / 2 };
        const r = Math.min(width, height);
        const namePieces = Flexagonator.namePiecesFromName(name);
        const patPieces = getPatPieces(namePieces);
        if (patPieces === null) {
            return;
        }
        paint.start();
        drawLines(paint, patPieces.count, center, r, patPieces.fold, 'dashed');
        drawLines(paint, patPieces.count, center, r, patPieces.cut1, 'solid');
        if (patPieces.cut2) {
            drawLines(paint, patPieces.count, center, r, patPieces.cut2, 'solid');
        }
        paint.end();
    }
    Flexagonator.drawByName = drawByName;
    /** draw the lines described by polarPoints */
    function drawLines(paint, count, center, width, polarPoints, how) {
        const points = Flexagonator.spin(count, center, width, polarPoints);
        paint.setLineColor(how === 'solid' ? "black" : 0x969696);
        const dashed = how === 'dashed' ? how : undefined;
        points.forEach(set => {
            const lines = set.map(p => { return { x: p.x, y: 2 * center.y - p.y }; });
            paint.drawLines(lines, dashed);
        });
    }
    /** get cut & fold lines for a named flexagon */
    function getPatPieces(name) {
        for (const piece of lookupPieces) {
            const check = piece[0];
            if (check.overallShape === name.overallShape && check.leafShape === name.leafShape && check.patsPrefix === name.patsPrefix) {
                return piece[1];
            }
        }
        return null;
    }
    /** flexagon name + cut & fold lines for it */
    const lookupPieces = [
        // trapezoids
        [
            { overallShape: 'triangular', leafShape: 'trapezoid', patsPrefix: 'tri' },
            {
                count: 3,
                cut1: [{ r: 1, θ: -30 }, { r: 1, θ: 90 }],
                cut2: [{ r: 0.3, θ: -30 }, { r: 0.3, θ: 90 }],
                fold: [{ r: 0.3, θ: -30 }, { r: 1, θ: -30 }]
            }
        ],
        [
            { overallShape: 'square ring', leafShape: 'trapezoid', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 1.414, θ: -45 }, { r: 1.414, θ: 45 }],
                cut2: [{ r: 0.5, θ: -45 }, { r: 0.5, θ: 45 }],
                fold: [{ r: 0.5, θ: -45 }, { r: 1.414, θ: -45 }]
            }
        ],
        [
            { overallShape: 'pentagonal ring', leafShape: 'trapezoid', patsPrefix: 'penta' },
            {
                count: 5,
                cut1: [{ r: 1, θ: 18 }, { r: 1, θ: 72 + 18 }],
                cut2: [{ r: 0.4, θ: 18 }, { r: 0.4, θ: 72 + 18 }],
                fold: [{ r: 0.4, θ: 18 }, { r: 1, θ: 18 }]
            }
        ],
        [
            { overallShape: 'hexagonal ring', leafShape: 'trapezoid', patsPrefix: 'hexa' },
            {
                count: 6,
                cut1: [{ r: 1, θ: 0 }, { r: 1, θ: 60 }],
                cut2: [{ r: 0.4, θ: 0 }, { r: 0.4, θ: 60 }],
                fold: [{ r: 0.4, θ: 0 }, { r: 1, θ: 0 }]
            }
        ],
        [
            { overallShape: 'heptagonal ring', leafShape: 'trapezoid', patsPrefix: 'hepta' },
            {
                count: 7,
                cut1: [{ r: 1, θ: 38.6 }, { r: 1, θ: 90 }],
                cut2: [{ r: 0.4, θ: 38.6 }, { r: 0.4, θ: 90 }],
                fold: [{ r: 0.4, θ: 38.6 }, { r: 1, θ: 38.6 }]
            }
        ],
        [
            { overallShape: 'octagonal ring', leafShape: 'trapezoid', patsPrefix: 'octa' },
            {
                count: 8,
                cut1: [{ r: 1, θ: 0 }, { r: 1, θ: 45 }],
                cut2: [{ r: 0.4, θ: 0 }, { r: 0.4, θ: 45 }],
                fold: [{ r: 0.4, θ: 0 }, { r: 1, θ: 0 }]
            }
        ],
        // tetraflexagons
        [
            { leafShape: 'square', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 1, θ: 0 }, { r: Math.sqrt(2), θ: 45 }, { r: 1, θ: 90 }],
                fold: [{ r: 0, θ: 0 }, { r: 1, θ: 0 }]
            }
        ],
        [
            { leafShape: 'pentagon', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 0.6, θ: 0 }, { r: 1.07, θ: 22 }, { r: 1.07, θ: 68 }, { r: 0.6, θ: 90 }],
                fold: [{ r: 0, θ: 0 }, { r: 0.6, θ: 0 }]
            }
        ],
        [
            { leafShape: 'hexagon', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 0.6, θ: 0 }, { r: 1.07, θ: 22 }, { r: 1.4, θ: 45 }, { r: 1.07, θ: 68 }, { r: 0.6, θ: 90 }],
                fold: [{ r: 0, θ: 0 }, { r: 0.6, θ: 0 }]
            }
        ],
        [
            { leafShape: 'heptagon', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 0.6, θ: 0 }, { r: 1.02, θ: 15 }, { r: 1.202, θ: 35 }, { r: 1.202, θ: 55 }, { r: 1.02, θ: 75 }, { r: 0.6, θ: 90 }],
                fold: [{ r: 0, θ: 0 }, { r: 0.6, θ: 0 }]
            }
        ],
        [
            { overallShape: 'ring', leafShape: 'octagon', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 0.7, θ: 0 }, { r: 1.03, θ: 16 }, { r: 1.21, θ: 35 }, { r: 1.21, θ: 55 }, { r: 1.03, θ: 74 }, { r: 0.7, θ: 90 }],
                cut2: [{ r: 0.29, θ: 0 }, { r: 0.29, θ: 90 }],
                fold: [{ r: 0.29, θ: 0 }, { r: 0.7, θ: 0 }]
            }
        ],
        [
            { leafShape: 'octagon', patsPrefix: 'tetra' },
            {
                count: 4,
                cut1: [{ r: 0.4, θ: 0 }, { r: 0.82, θ: 14 }, { r: 1.16, θ: 31 }, { r: 1.39, θ: 45 }, { r: 1.16, θ: 59 }, { r: 0.82, θ: 76 }, { r: 0.4, θ: 90 }],
                fold: [{ r: 0, θ: 0 }, { r: 0.4, θ: 0 }]
            }
        ],
        // hexaflexagons
        [
            { overallShape: 'hexagonal', leafShape: 'kite', patsPrefix: 'hexa' },
            {
                count: 6,
                cut1: [{ r: 0.866, θ: -90 }, { r: 1, θ: -60 }, { r: 0.866, θ: -30 }],
                fold: [{ r: 0, θ: -90 }, { r: 0.866, θ: -90 }]
            }
        ],
        [
            { overallShape: 'dodecagonal', leafShape: 'rhombus', patsPrefix: 'hexa' },
            {
                count: 6,
                cut1: [{ r: 0.577, θ: -90 }, { r: 1, θ: -60 }, { r: 0.577, θ: -30 }],
                fold: [{ r: 0, θ: -90 }, { r: 0.577, θ: -90 }]
            }
        ],
        [
            { leafShape: 'pentagon', patsPrefix: 'hexa' },
            {
                count: 6,
                cut1: [{ r: 0.768, θ: 0 }, { r: 1.01, θ: 19 }, { r: 1.01, θ: 41 }, { r: 0.768, θ: 60 }],
                cut2: [{ r: 0, θ: 0 }, { r: 0, θ: 60 }],
                fold: [{ r: 0, θ: 0 }, { r: 0.768, θ: 0 }]
            }
        ],
        [
            { leafShape: 'hexagon', patsPrefix: 'hexa' },
            {
                count: 6,
                cut1: [{ r: 0.768, θ: 0 }, { r: 1.01, θ: 19 }, { r: 1.01, θ: 41 }, { r: 0.768, θ: 60 }],
                cut2: [{ r: 0.384, θ: 0 }, { r: 0.384, θ: 60 }],
                fold: [{ r: 0.384, θ: 0 }, { r: 0.768, θ: 0 }]
            }
        ],
        // octaflexagons
        [
            { overallShape: 'square ring', leafShape: 'square', patsPrefix: 'octa' },
            {
                count: 4,
                cut1: [{ r: 1.414, θ: 45 }, { r: 1.414, θ: 135 }],
                cut2: [{ r: 0.33 * 1.414, θ: 45 }, { r: 0.33 * 1.414, θ: 135 }],
                fold: [{ r: 1.05, θ: 72 }, { r: 0.47, θ: 45 }, { r: 0.47, θ: 135 }, { r: 1.05, θ: 108 }]
            }
        ],
    ];
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    let StructureType;
    (function (StructureType) {
        StructureType[StructureType["None"] = 0] = "None";
        StructureType[StructureType["All"] = 1] = "All";
        StructureType[StructureType["TopIds"] = 2] = "TopIds";
    })(StructureType = Flexagonator.StructureType || (Flexagonator.StructureType = {}));
    function drawFlexagon(paint, flexagon, polygon, props, front, patstructure, showids, showCurrent, showNumbers, showCenterMarker, scaleStructure) {
        const markerText = polygon.radius / 6;
        const largeText = polygon.radius / (flexagon.getPatCount() >= 10 ? 6 : 5);
        const smallText = polygon.radius / 14;
        const patText = scaleStructure ? smallText * scaleStructure : smallText;
        const ids = front ? flexagon.getTopIds() : flexagon.getBottomIds().reverse();
        if (props !== undefined) {
            drawFaceProps(paint, polygon, props, ids);
        }
        paint.setLineColor(0x5a96d2);
        const corners = polygon.getCorners();
        drawPolygon(paint, corners);
        drawSpokes(paint, corners, polygon.xCenter, polygon.yCenter);
        if (showCurrent === undefined || showCurrent) {
            drawText(paint, markerText, corners[0], corners[1], "⚹");
        }
        if (showNumbers === undefined || showNumbers) {
            drawFaceText(paint, largeText, polygon.getFaceCenters(0.6), ids, props);
        }
        if (showids && props !== undefined) {
            drawFaceText(paint, smallText, polygon.getFaceCenters(0.3), ids);
        }
        if (patstructure !== StructureType.None) {
            drawPatStructures(paint, patText, polygon.getFaceCenters(1.05), flexagon, patstructure, front);
        }
        if (showCenterMarker) {
            drawCenterMarker(paint, markerText, polygon, flexagon.angleTracker.oldCorner);
        }
    }
    Flexagonator.drawFlexagon = drawFlexagon;
    function drawFaceProps(paint, polygon, props, ids) {
        const triangles = polygon.getLeafTriangles();
        for (const i in triangles) {
            const leafId = ids[i];
            const color = props.getColorAsRGBString(leafId);
            if (color !== undefined) {
                const t = triangles[i];
                paint.setFillColor(color);
                paint.drawPolygon([{ x: t.x1, y: t.y1 }, { x: t.x2, y: t.y2 }, { x: t.x3, y: t.y3 }], "fill");
            }
        }
    }
    function drawPolygon(paint, corners) {
        const points = [];
        for (let i = 0; i < corners.length; i += 2) {
            points.push({ x: corners[i], y: corners[i + 1] });
        }
        paint.drawPolygon(points);
    }
    function drawSpokes(paint, corners, xCenter, yCenter) {
        for (let i = 0; i < corners.length; i += 2) {
            paint.drawLines([{ x: xCenter, y: yCenter }, { x: corners[i], y: corners[i + 1] }]);
            if (i === 0) {
                paint.drawLines([{ x: corners[0], y: corners[1] }, { x: corners[corners.length - 2], y: corners[corners.length - 1] }]);
            }
            else {
                paint.drawLines([{ x: corners[i - 2], y: corners[i - 1] }, { x: corners[i], y: corners[i + 1] }]);
            }
        }
    }
    function setTextProps(paint, fontsize) {
        paint.setTextColor("black");
        paint.setTextHorizontal("center");
        paint.setTextVertical("middle");
        paint.setTextSize(fontsize);
    }
    function drawPatStructures(paint, fontsize, centers, flexagon, patstructure, front) {
        if (patstructure === StructureType.None) {
            return;
        }
        setTextProps(paint, fontsize);
        const count = flexagon.getPatCount();
        for (let i = 0; i < count; i++) {
            const pat = flexagon.pats[front ? i : count - i - 1];
            const displayPat = front ? pat : pat.makeFlipped();
            const structure = patstructure === StructureType.All
                ? displayPat.getStructure()
                : displayPat.getStructureLTEId(flexagon.getPatCount());
            paint.drawText(structure, centers[i * 2], centers[i * 2 + 1]);
        }
    }
    function drawFaceText(paint, fontsize, centers, ids, props) {
        setTextProps(paint, fontsize);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const label = props === undefined ? id.toString() : props.getFaceLabel(id) || id.toString();
            paint.drawText(label, centers[i * 2], centers[i * 2 + 1]);
        }
    }
    function drawCenterMarker(paint, fontsize, polygon, whichVertex) {
        const centers = polygon.getCenterMarkers(whichVertex);
        for (let i = 0; i < centers.length; i += 2) {
            drawText(paint, fontsize, centers[i], centers[i + 1], "⚹");
        }
    }
    function drawText(paint, fontsize, x, y, text) {
        setTextProps(paint, fontsize);
        paint.drawText(text, x, y);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // draw a flexagon in its current state, with optional colors, flexes, etc.
    function drawEntireFlexagon(canvas, fm, options) {
        const objects = {
            flexagon: fm.flexagon,
            angleInfo: fm.getAngleInfo(),
            leafProps: fm.leafProps,
            allFlexes: fm.allFlexes,
            flexesToSearch: fm.flexesToSearch,
        };
        return drawEntireFlexagonObjects(canvas, objects, options);
    }
    Flexagonator.drawEntireFlexagon = drawEntireFlexagon;
    function drawEntireFlexagonObjects(target, objects, options) {
        const paint = Flexagonator.newPaint(target);
        if (paint === null) {
            return [];
        }
        const [width, height] = paint.getSize();
        if (!options) {
            options = {};
        }
        if (options.drawover === undefined || !options.drawover) {
            paint.start();
        }
        else {
            paint.start("dontClear");
        }
        const showFront = (options.back === undefined || !options.back);
        const rotate = options.rotate === undefined ? options.rotate : (showFront ? options.rotate : -options.rotate);
        const polygon = createPolygon(width, height, objects.flexagon, objects.angleInfo, showFront, options.scale, rotate);
        const showStructure = getStructureType(options);
        const showIds = (options.showIds === undefined || options.showIds);
        const showCurrent = (options.showCurrent === undefined || options.showCurrent);
        const showNumbers = (options.showNumbers === undefined || options.showNumbers);
        const showCenterMarker = options.showCenterMarker === undefined ? false : options.showCenterMarker;
        let hinges = undefined;
        if (objects.flexagon.directions !== undefined) {
            hinges = Flexagonator.drawWithDirections(paint, objects, showFront, showStructure, showIds, showCurrent, showNumbers, rotate);
            if (options.stats !== undefined && options.stats) {
                drawLeafCount(paint, objects.flexagon);
            }
        }
        else {
            Flexagonator.drawFlexagon(paint, objects.flexagon, polygon, objects.leafProps, showFront, showStructure, showIds, showCurrent, showNumbers, showCenterMarker, options.scaleStructure);
            if (options.both) {
                const backpolygon = createBackPolygon(width, height, objects.flexagon, objects.angleInfo);
                Flexagonator.drawFlexagon(paint, objects.flexagon, backpolygon, objects.leafProps, false /*showFront*/, Flexagonator.StructureType.None, false /*showIds*/);
            }
            if (options.stats !== undefined && options.stats) {
                drawLeafCount(paint, objects.flexagon);
                drawAnglesText(paint, objects.flexagon, objects.angleInfo);
            }
        }
        paint.end();
        const generate = (options.generate !== undefined && options.generate);
        return Flexagonator.createFlexRegions(objects.flexagon, objects.allFlexes, objects.flexesToSearch, !showFront, generate, polygon, hinges);
    }
    function getStructureType(options) {
        if (options === undefined) {
            return Flexagonator.StructureType.None;
        }
        return options.structure ? Flexagonator.StructureType.All : (options.structureTopIds ? Flexagonator.StructureType.TopIds : Flexagonator.StructureType.None);
    }
    // draw the possible flexes and return buttons describing them
    function drawScriptButtons(canvas, flexagon, angleInfo, showFront, regions, fontsize) {
        const output = canvas instanceof HTMLCanvasElement ? canvas : document.getElementById(canvas);
        const ctx = output.getContext("2d");
        const [width, height] = [ctx.canvas.clientWidth, ctx.canvas.clientHeight];
        const polygon = createPolygon(width, height, flexagon, angleInfo, showFront);
        const bheight = fontsize !== undefined ? fontsize : polygon.radius / 9;
        return Flexagonator.drawPossibleFlexes(ctx, regions, bheight);
    }
    Flexagonator.drawScriptButtons = drawScriptButtons;
    function getButtonRegions(fm, width, height, front, generate) {
        generate = (generate !== undefined && generate);
        const polygon = createPolygon(width, height, fm.flexagon, fm.getAngleInfo(), front);
        return Flexagonator.createFlexRegions(fm.flexagon, fm.allFlexes, fm.flexesToSearch, !front, generate, polygon);
    }
    Flexagonator.getButtonRegions = getButtonRegions;
    function drawLeafCount(paint, flexagon) {
        paint.setTextColor("black");
        paint.setTextHorizontal("left");
        paint.setTextVertical("bottom");
        paint.setTextSize(14);
        const leafCount = flexagon.getLeafCount();
        const leafText = leafCount.toString() + " leaves";
        paint.drawText(leafText, 0, 20);
    }
    function drawAnglesText(paint, flexagon, angleInfo) {
        const center = angleInfo.getCenterAngleSum(flexagon);
        if (center === Flexagonator.CenterAngle.GreaterThan360) {
            paint.drawText(">360, doesn't lie flat", 0, 40);
        }
        else if (center === Flexagonator.CenterAngle.LessThan360) {
            paint.drawText("<360, doesn't open fully", 0, 40);
        }
    }
    function createPolygon(width, height, flexagon, angleInfo, showFront, scale, rotate) {
        const xCenter = width / 2;
        const yCenter = height / 2;
        const possible = height * 0.42 * (scale === undefined ? 1 : scale);
        const radius = Math.min(possible, Math.max(width / 2, height / 2)); // cap scaled size so it fits in box
        const angles = angleInfo.getAngles(flexagon);
        return new Flexagonator.Polygon(flexagon.getPatCount(), xCenter, yCenter, radius, angles, showFront, rotate);
    }
    function createBackPolygon(width, height, flexagon, angleInfo) {
        const radius = height * 0.2;
        const xCenter = width - radius;
        const yCenter = height - radius;
        const angles = angleInfo.getAngles(flexagon);
        return new Flexagonator.Polygon(flexagon.getPatCount(), xCenter, yCenter, radius, angles, false /*showFront*/);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // draw possible flexes & create buttons that understand the associated flexes
    function drawPossibleFlexes(ctx, regions, height) {
        const buttons = new Flexagonator.ButtonsBuilder();
        ctx.font = height + "px sans-serif";
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        for (const i in regions) {
            addFlexes(ctx, regions[i], height, buttons);
        }
        return buttons.create();
    }
    Flexagonator.drawPossibleFlexes = drawPossibleFlexes;
    // draw each flex and add a button that knows how to apply the flex
    function addFlexes(ctx, region, h, 
    /*output*/ buttons) {
        const spaceWidth = ctx.measureText(' ').width;
        const pad = 3;
        const y = region.corner.y + h;
        let x = region.corner.x;
        const isOnLeft = x < 2 ? false : region.isOnLeft;
        for (let flex of region.flexes) {
            const metrics = ctx.measureText(flex);
            const thisx = isOnLeft ? x - metrics.width : x;
            const thisy = region.isOnTop ? y - h : y;
            const thisflex = region.prefix + flex + region.postfix;
            const thisWidth = metrics.width;
            ctx.fillText(flex, thisx, thisy);
            buttons.addFlexButton({ x: thisx - pad, y: thisy - h - pad, w: thisWidth + pad * 2, h: h + pad * 2 }, thisflex);
            x = isOnLeft ? x - thisWidth - spaceWidth : x + thisWidth + spaceWidth;
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    const traverseColor = 0xb4b4b4;
    const flexColor = 0x1464aa;
    const startColor = 0x14c832;
    const endColor = 0xc81464;
    // draw the graph described by a given series of flexes in {P, P', ^, <, >},
    // and/or drawing the corresponding Tuckerman traverse
    function drawPinchGraph(target, options) {
        const paint = Flexagonator.newPaint(target);
        if (paint === null) {
            return;
        }
        const [w, h] = paint.getSize();
        const box = { x: w, y: h };
        paint.start();
        var transform = null;
        if (options.traverse) {
            const traverseGraph = Flexagonator.createPinchGraph(options.traverse);
            if (Flexagonator.isFlexError(traverseGraph)) {
                return traverseGraph;
            }
            transform = Flexagonator.Transform.make(box, traverseGraph.min, traverseGraph.max);
            paint.setLineColor(traverseColor);
            drawGraph(paint, transform, traverseGraph);
            if (options.drawEnds && traverseGraph.points.length > 0) {
                paint.setLineColor(startColor);
                drawCircle(paint, transform, traverseGraph.points[0], 0.1);
            }
        }
        if (options.flexes) {
            const flexGraph = Flexagonator.createPinchGraph(options.flexes);
            if (Flexagonator.isFlexError(flexGraph)) {
                return flexGraph;
            }
            if (!transform) {
                transform = Flexagonator.Transform.make(box, flexGraph.min, flexGraph.max);
            }
            paint.setLineColor(flexColor);
            drawGraph(paint, transform, flexGraph);
            if (options.drawEnds && flexGraph.points.length > 0) {
                paint.setLineColor(endColor);
                drawCircle(paint, transform, flexGraph.points[flexGraph.points.length - 1], 0.09);
            }
        }
        paint.end();
        return true;
    }
    Flexagonator.drawPinchGraph = drawPinchGraph;
    function drawGraph(paint, transform, graph) {
        const points = graph.points.map(p => transform.apply(p));
        paint.drawLines(points);
    }
    function drawCircle(paint, transform, p, radius) {
        const center = transform.apply(p);
        const size = transform.applyScale(radius);
        paint.drawCircle(center, size);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function drawStrip(paint, leaflines, content, props, scale, rotation, captions, center) {
        const [w, h] = paint.getSize();
        if (rotation !== undefined) {
            leaflines = Flexagonator.rotateLeafLines(leaflines, Flexagonator.toRadians(rotation));
        }
        else {
            [leaflines] = Flexagonator.findBestRotation(leaflines, { x: w, y: h });
        }
        const extents = Flexagonator.getExtents(leaflines);
        const flip = (content.face === 'back') ? 'x' : (content.face === 'back-y') ? 'y' : undefined;
        const transform = Flexagonator.Transform.make({ x: w, y: h }, extents[0], extents[1], flip, scale, 1, center);
        drawLeafContents(paint, leaflines, content, props, transform);
        if (captions) {
            paint.setTextColor("black");
            for (const caption of captions) {
                drawLeafCaption(paint, transform, leaflines, caption);
            }
        }
        // alternate gray & white dashes
        paint.setLineColor(0x969696);
        drawLines(paint, leaflines.folds, transform, "dashed");
        paint.setLineColor("black");
        drawLines(paint, leaflines.cuts, transform);
        if (content.endStyle === 'solid') {
            const ends = [leaflines.folds[0], leaflines.folds[leaflines.folds.length - 1]];
            drawLines(paint, ends, transform);
        }
    }
    Flexagonator.drawStrip = drawStrip;
    function drawLeafContents(paint, leaflines, content, props, transform) {
        if (content.face === 'front' || content.face === 'back' || content.face === 'back-y') {
            if (content.showLeafProps) {
                drawFaceProps(paint, leaflines.faces, transform, props, content.face === 'front', content.inset);
            }
        }
        else {
            // if both 'folding order' & 'leaf props', 'folding order' is drawn offset & lighter
            if (content.showFoldingOrder && !content.showLeafProps) {
                drawFoldingLabels(paint, leaflines.faces, transform);
            }
            if (content.showLeafProps) {
                drawLeafLabels(paint, leaflines.faces, transform, props, !content.showFoldingOrder);
            }
        }
        if (content.showIds && content.face !== 'back' && content.face !== 'back-y') {
            drawIds(paint, leaflines.faces, transform);
        }
    }
    function drawLines(paint, lines, transform, dashed) {
        for (const line of lines) {
            paint.drawLines([transform.apply(line.a), transform.apply(line.b)], dashed);
        }
    }
    function getBaseLength(face, transform) {
        const a = Flexagonator.lengthOf(face.corners[0], face.corners[1]);
        const b = Flexagonator.lengthOf(face.corners[1], face.corners[2]);
        const c = Flexagonator.lengthOf(face.corners[2], face.corners[0]);
        const avg = (a + b + c) / 3;
        return transform.applyScale(0.8 * avg);
    }
    function drawFoldingLabels(paint, faces, transform) {
        const len = getBaseLength(faces[0], transform);
        for (const face of faces) {
            const incenter = Flexagonator.getIncenter(face.corners[0], face.corners[1], face.corners[2]);
            const p = transform.apply(incenter);
            const y = p.y + len * 0.05;
            paint.setTextHorizontal("right");
            paint.setTextSize(len / 5);
            paint.drawText(face.leaf.top.toString(), p.x, y);
            paint.setTextHorizontal("left");
            paint.setTextSize(len / 8);
            paint.drawText(" " + face.leaf.bottom.toString(), p.x, y);
        }
    }
    function drawIds(paint, faces, transform) {
        const len = getBaseLength(faces[0], transform);
        paint.setTextColor("black");
        paint.setTextHorizontal("center");
        paint.setTextVertical("middle");
        paint.setTextSize(len / 10);
        for (const face of faces) {
            // put the text near one corner in the direction of the incenter
            const incenter = Flexagonator.getIncenter(face.corners[0], face.corners[1], face.corners[2]);
            const p = transform.apply(incenter);
            const c = transform.apply(face.corners[2]);
            const x = (c.x * 2 + p.x) / 3;
            const y = (c.y * 2 + p.y) / 3;
            paint.drawText(face.leaf.id.toString(), x, y);
        }
    }
    function drawFaceProps(paint, faces, transform, props, front, inset) {
        const len = getBaseLength(faces[0], transform);
        paint.setTextHorizontal("center");
        paint.setTextVertical("middle");
        for (const face of faces) {
            const incenter = Flexagonator.getIncenter(face.corners[0], face.corners[1], face.corners[2]);
            const id = front ? face.leaf.id : -face.leaf.id;
            const color = props.getColorAsRGBString(id);
            if (color !== undefined) {
                paint.setFillColor(color);
                const corners = insetCorners(face.corners, incenter, inset);
                const p1 = transform.apply(corners[0]);
                const p2 = transform.apply(corners[1]);
                const p3 = transform.apply(corners[2]);
                paint.drawPolygon([p1, p2, p3], "fill");
            }
            const label = props.getFaceLabel(id) || (front ? face.leaf.top.toString() : face.leaf.bottom.toString());
            const p = transform.apply(incenter);
            paint.setTextSize(len / 5);
            paint.setTextColor("black");
            paint.drawText(label, p.x, p.y);
        }
    }
    function insetCorners(corners, incenter, inset) {
        if (inset === undefined) {
            return corners;
        }
        const insetFraction = inset < 0 ? 0 : inset > 1 ? 1 : inset;
        const w1 = 1 - insetFraction;
        const w2 = insetFraction;
        const a = { x: (w1 * corners[0].x + w2 * incenter.x), y: (w1 * corners[0].y + w2 * incenter.y) };
        const b = { x: (w1 * corners[1].x + w2 * incenter.x), y: (w1 * corners[1].y + w2 * incenter.y) };
        const c = { x: (w1 * corners[2].x + w2 * incenter.x), y: (w1 * corners[2].y + w2 * incenter.y) };
        return [a, b, c];
    }
    function drawLeafLabels(paint, faces, transform, props, useId) {
        const len = getBaseLength(faces[0], transform);
        for (const face of faces) {
            const incenter = Flexagonator.getIncenter(face.corners[0], face.corners[1], face.corners[2]);
            const p = transform.apply(incenter);
            const y = p.y + len * 0.05;
            const y2 = p.y + len * 0.22;
            paint.setTextColor("black");
            const toplabel = props.getFaceLabel(face.leaf.id);
            if (toplabel) {
                paint.setTextHorizontal("right");
                paint.setTextSize(len / 5);
                paint.drawText(toplabel, p.x, y);
            }
            const bottomlabel = props.getFaceLabel(-face.leaf.id);
            if (bottomlabel) {
                paint.setTextHorizontal("left");
                paint.setTextSize(len / 8);
                paint.drawText(" " + bottomlabel, p.x, y);
            }
            paint.setTextColor(0x999999);
            // this logic is intended to make it so LeafLabels doesn't display folding numbers if there are leaf properties,
            // but LabelsAndFolding will always display the folding numbers
            if (!toplabel || !useId) {
                const toplabel2 = (useId ? face.leaf.id.toString() : face.leaf.top.toString());
                paint.setTextHorizontal("right");
                paint.setTextSize(len / 8);
                paint.drawText(toplabel2, p.x, y2);
            }
            if (!bottomlabel || !useId) {
                const bottomlabel2 = (useId ? (-face.leaf.id).toString() : face.leaf.bottom.toString());
                paint.setTextHorizontal("left");
                paint.setTextSize(len / 11);
                paint.drawText(" " + bottomlabel2, p.x, y2);
            }
        }
    }
    /** draw an extra caption on the specified leaf,
     * if (caption.which<0), then it's an offset from the end of the string */
    function drawLeafCaption(paint, transform, leaflines, caption) {
        const [face, line] = getFace(leaflines, caption.which, caption.edge);
        const p = computeBasePoint(face, line, transform);
        const len = getBaseLength(face, transform) * (caption.scale !== undefined ? caption.scale : 1);
        paint.setTextHorizontal("center");
        paint.setTextVertical("middle");
        paint.setTextSize(len / 9);
        paint.drawText(caption.text, p.x, p.y);
    }
    /** figure out where to draw based on which face we want */
    function getFace(leaflines, which, edge) {
        let face;
        let line;
        if (which == 0) {
            face = leaflines.faces[which];
            line = leaflines.folds[0]; // first fold
        }
        else if (which == -1) {
            face = leaflines.faces[leaflines.faces.length + which];
            line = leaflines.folds[leaflines.folds.length - 1]; // last fold
        }
        else if (which > 0) {
            face = leaflines.faces[which];
            line = { a: face.corners[0], b: face.corners[1] };
        }
        else {
            face = leaflines.faces[leaflines.faces.length + which];
            line = { a: face.corners[0], b: face.corners[1] };
        }
        if (edge !== undefined) {
            line = { a: face.corners[edge], b: face.corners[(edge + 1) % 3] };
        }
        return [face, line];
    }
    function computeBasePoint(face, line, transform) {
        const a = face.corners[0], b = face.corners[1], c = face.corners[2];
        const incenter = Flexagonator.getIncenter(a, b, c);
        const middle = { x: (line.a.x + line.b.x) / 2, y: (line.a.y + line.b.y) / 2 };
        // weight toward the edge rather than center
        const textpoint = { x: (incenter.x + 3 * middle.x) / 4, y: (incenter.y + 3 * middle.y) / 4 };
        const p = transform.apply(textpoint);
        return p;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // deprecated: use LeafContent instead
    let StripContent;
    (function (StripContent) {
        StripContent[StripContent["FoldingLabels"] = 0] = "FoldingLabels";
        StripContent[StripContent["FoldingAndIds"] = 1] = "FoldingAndIds";
        StripContent[StripContent["Front"] = 2] = "Front";
        StripContent[StripContent["Back"] = 3] = "Back";
        StripContent[StripContent["LeafLabels"] = 4] = "LeafLabels";
        StripContent[StripContent["LabelsAndFolding"] = 5] = "LabelsAndFolding";
        StripContent[StripContent["Empty"] = 6] = "Empty";
    })(StripContent = Flexagonator.StripContent || (Flexagonator.StripContent = {}));
    // draw an unfolded flexagon strip
    function drawUnfolded(target, fm, options) {
        const directions = fm.getDirections();
        const objects = {
            flexagon: fm.flexagon,
            angleInfo: fm.getAngleInfo(),
            directions: directions ? directions.asRaw() : undefined,
            leafProps: fm.leafProps,
        };
        return drawUnfoldedObjects(target, objects, options);
    }
    Flexagonator.drawUnfolded = drawUnfolded;
    function drawUnfoldedObjects(target, objects, options) {
        const slices = new TrackSlices(target, options);
        if (!slices.isMatched) {
            console.log("drawUnfoldedObjects: mismatched targets & slices");
        }
        const directions = objects.directions ? Flexagonator.Directions.make(objects.directions) : undefined;
        const unfolded = Flexagonator.unfold(objects.flexagon.getAsLeafTrees(), directions);
        if (Flexagonator.isTreeError(unfolded)) {
            console.log("drawUnfoldedObjects: error unfolding flexagon");
            console.log(unfolded);
            return;
        }
        const angles = objects.angleInfo.getUnfoldedAngles(objects.flexagon, unfolded);
        const leaflines = Flexagonator.leafsToLines(unfolded, Flexagonator.toRadians(angles[0]), Flexagonator.toRadians(angles[1]));
        slices.computeAcross(leaflines);
        for (let i = 0; i < slices.paints.length; i++) {
            const paint = slices.paints[i];
            const opt = slices.options[i];
            if (paint && opt) {
                const content = getLeafContent(opt.content);
                const leaflinesSubset = Flexagonator.sliceLeafLines(leaflines, opt.start, opt.end);
                paint.start();
                Flexagonator.drawStrip(paint, leaflinesSubset, content, objects.leafProps, opt.scale, opt.rotation, opt.captions);
                paint.end();
            }
        }
    }
    Flexagonator.drawUnfoldedObjects = drawUnfoldedObjects;
    /** keep track of info for each slice of the strip we're drawing */
    class TrackSlices {
        constructor(target, options) {
            if (Array.isArray(target)) {
                this.paints = target.map(t => Flexagonator.newPaint(t));
            }
            else {
                this.paints = [Flexagonator.newPaint(target)];
            }
            if (Array.isArray(options)) {
                this.options = options;
            }
            else if (options) {
                this.options = [options];
            }
            else {
                this.options = [{}];
            }
            this.isMatched = (this.paints.length === this.options.length);
        }
        /** if needed, compute a common scale */
        computeAcross(leaflines) {
            if (this.options[0].scale) {
                return; // scale is already set
            }
            // find scale that works for every slice
            const paints = this.paints.filter(p => p !== null);
            const sliceIn = paints.map((p, i) => {
                const [width, height] = p.getSize();
                const options = this.options[i];
                return Object.assign(Object.assign({}, options), { width, height });
            });
            const sliceOut = Flexagonator.computeAcrossSlices(leaflines, sliceIn);
            this.options = sliceOut.map((s, i) => {
                return Object.assign(Object.assign({}, this.options[i]), { scale: s.scale });
            });
        }
    }
    // use showFoldingOrder if nothing specified
    function getLeafContent(content) {
        switch (content) {
            case StripContent.FoldingLabels:
                return { showFoldingOrder: true };
            case StripContent.FoldingAndIds:
                return { showFoldingOrder: true, showIds: true };
            case StripContent.Front:
                return { face: 'front', showLeafProps: true };
            case StripContent.Back:
                return { face: 'back', showLeafProps: true };
            case StripContent.LeafLabels:
                return { showLeafProps: true };
            case StripContent.LabelsAndFolding:
                return { showLeafProps: true, showFoldingOrder: true };
            case StripContent.Empty:
                return {};
        }
        return content ? content : { showFoldingOrder: true };
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * draw a flexagon that specifies directions, with lots of options for additional pieces
     * @returns hinges in pixels
     */
    function drawWithDirections(paint, objects, showFront, showStructure, showIds, showCurrent, showNumbers, rotation) {
        const leaflines = getLeafLines(objects.flexagon, objects.angleInfo, showFront, rotation);
        const content = { showLeafProps: true, showIds, face: showFront ? 'front' : 'back', inset: 0.1 };
        const leafProps = fillInProps(objects.leafProps, objects.flexagon.getTopIds(), objects.flexagon.getBottomIds(), showNumbers);
        Flexagonator.drawStrip(paint, leaflines, content, leafProps, undefined, 0, undefined, true /*center*/);
        const transform = getTransform(paint, leaflines, showFront);
        const hinges = getHingeLines(leaflines, transform);
        const edge = getAverageEdge(leaflines, transform);
        if (showCurrent) {
            drawCurrentMarker(paint, hinges[0], edge / 5);
        }
        if (showStructure !== Flexagonator.StructureType.None) {
            const centers = getCenterPoints(leaflines, transform);
            drawPatStructures(paint, edge / 14, centers, objects.flexagon, showStructure);
        }
        return hinges;
    }
    Flexagonator.drawWithDirections = drawWithDirections;
    /** use directions & angles to figure out how to draw the flexagon surface */
    function getLeafLines(flexagon, angleInfo, showFront, rotation) {
        // for 'back', drawStrip assumes it needs to negate the ids, so we need to adjust here
        const ids = showFront ? flexagon.getTopIds() : flexagon.getBottomIds().map(id => -id);
        const leafs = getAsLeafs(flexagon.getPatCount(), ids, flexagon.directions);
        const angles = angleInfo.getUnfoldedAngles(flexagon, leafs);
        const leaflines = Flexagonator.leafsToLines(leafs, Flexagonator.toRadians(angles[0]), Flexagonator.toRadians(angles[1]));
        // rotate lines so the current hinge is at the top, then add in user specified rotation
        const straighten = getCurrentHingeAngle(leaflines);
        rotation = (rotation === undefined ? 0 : Flexagonator.toRadians(rotation)) - straighten - Math.PI / 2;
        return Flexagonator.rotateLeafLines(leaflines, rotation);
    }
    /** figure out angle to the current hinge */
    function getCurrentHingeAngle(leaflines) {
        const extents = Flexagonator.getExtents(leaflines);
        const prime = leaflines.folds[0];
        const cx = (extents[0].x + extents[1].x) / 2;
        const cy = (extents[0].y + extents[1].y) / 2;
        const px = (prime.a.x + prime.b.x) / 2;
        const py = (prime.a.y + prime.b.y) / 2;
        return Math.atan2(py - cy, px - cx);
    }
    /** turn raw flexagon info into a form used to generate lines to draw  */
    function getAsLeafs(patCount, ids, directions) {
        const leafs = [];
        for (let i = 0; i < patCount; i++) {
            const isClock = directions ? directions.isDown(i) : true;
            leafs.push({ id: ids[i], top: 0, bottom: 0, isClock });
        }
        return leafs;
    }
    /** if any labels are missing, use the associated leaf id instead */
    function fillInProps(leafProps, topIds, bottomIds, showNumbers) {
        const newProps = new Flexagonator.PropertiesForLeaves();
        fillInIds(leafProps, topIds, newProps, showNumbers);
        fillInIds(leafProps, bottomIds, newProps, showNumbers);
        return newProps;
    }
    function fillInIds(leafProps, ids, newProps, showNumbers) {
        for (const id of ids) {
            const label = showNumbers ? leafProps.getFaceLabel(id) : ' ';
            const color = leafProps.getColorProp(id);
            newProps.setLabelProp(id, label === undefined ? id.toString() : label);
            if (color !== undefined) {
                newProps.setColorProp(id, color);
            }
        }
    }
    function getTransform(paint, leaflines, showFront) {
        const [w, h] = paint.getSize();
        const extents = Flexagonator.getExtents(leaflines);
        const flip = showFront ? undefined : 'x';
        return Flexagonator.Transform.make({ x: w, y: h }, extents[0], extents[1], flip, undefined, 1, true /*center*/);
    }
    /** transform raw folds in abstract coordinates into hinge lines in pixels */
    function getHingeLines(leaflines, transform) {
        const lines = leaflines.folds.map(hinge => {
            return {
                a: transform.apply(hinge.a), b: transform.apply(hinge.b)
            };
        });
        return lines;
    }
    /** transform raw triangular faces in abstract coordinates into center points in pixels */
    function getCenterPoints(leaflines, transform) {
        const centers = leaflines.faces.map(face => {
            const center = Flexagonator.getIncenter(face.corners[0], face.corners[1], face.corners[2]);
            const centerPix = transform.apply(center);
            return { x: centerPix.x, y: centerPix.y };
        });
        return centers;
    }
    function getAverageEdge(leaflines, transform) {
        const corners = leaflines.faces[0].corners;
        const pixels = corners.map(c => transform.apply(c));
        const a = Flexagonator.lengthOf(pixels[0], pixels[1]);
        const b = Flexagonator.lengthOf(pixels[1], pixels[2]);
        const c = Flexagonator.lengthOf(pixels[2], pixels[0]);
        return (a + b + c) / 3;
    }
    function setTextProps(paint, fontsize) {
        paint.setTextColor("black");
        paint.setTextHorizontal("center");
        paint.setTextVertical("middle");
        paint.setTextSize(fontsize);
    }
    /** put a * at the current hinge */
    function drawCurrentMarker(paint, line, fontsize) {
        setTextProps(paint, fontsize);
        const x = (line.a.x + line.b.x) / 2;
        const y = (line.a.y + line.b.y) / 2;
        paint.drawText('⚹', x, y);
    }
    /** draw pat structure, like [-[--]], near the centers of the faces */
    function drawPatStructures(paint, fontsize, centers, flexagon, patstructure) {
        if (patstructure === Flexagonator.StructureType.None) {
            return;
        }
        setTextProps(paint, fontsize);
        for (let i = 0; i < flexagon.getPatCount(); i++) {
            const pat = flexagon.pats[i];
            const structure = patstructure === Flexagonator.StructureType.All
                ? pat.getStructure()
                : pat.getStructureLTEId(flexagon.getPatCount());
            paint.drawText(structure, centers[i].x, centers[i].y + 15);
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** return the appropriate Paint implementation, either canvas or svg */
    function newPaint(target) {
        // we either have an element name or the element itself
        const element = (typeof target === 'string')
            ? document.getElementById(target)
            : target;
        if (element === null) {
            return null;
        }
        // figure out the appropriate paint
        if (element.getContext !== undefined) {
            return new Flexagonator.PaintCanvas(element.getContext("2d"));
        }
        return new Flexagonator.PaintSvg(element);
    }
    Flexagonator.newPaint = newPaint;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function colorAsHtmlString(color) {
        if (typeof color === "string") {
            return color;
        }
        return "rgb("
            + ((color & 0xff0000) >> 16).toString() + ","
            + ((color & 0xff00) >> 8).toString() + ","
            + (color & 0xff).toString() + ")";
    }
    Flexagonator.colorAsHtmlString = colorAsHtmlString;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** interface for drawing flexagons on a canvas */
    class PaintCanvas {
        constructor(ctx) {
            this.ctx = ctx;
        }
        start(dontClear) {
            if (dontClear !== "dontClear") {
                const [width, height] = this.getSize();
                this.ctx.fillStyle = "white";
                this.ctx.fillRect(0, 0, width + 3, height + 3);
                this.ctx.fillStyle = "black";
            }
            this.ctx.save();
        }
        end() {
            this.ctx.restore();
        }
        getSize() {
            return [this.ctx.canvas.clientWidth - 2, this.ctx.canvas.clientHeight - 2];
        }
        setLineColor(color) {
            this.ctx.strokeStyle = Flexagonator.colorAsHtmlString(color);
        }
        setFillColor(color) {
            this.ctx.fillStyle = Flexagonator.colorAsHtmlString(color);
        }
        setTextColor(color) {
            this.ctx.fillStyle = Flexagonator.colorAsHtmlString(color);
        }
        setTextSize(pixels) {
            this.ctx.font = pixels.toString() + "px sans-serif";
        }
        setTextVertical(align) {
            this.ctx.textBaseline = align;
        }
        setTextHorizontal(align) {
            this.ctx.textAlign = align;
        }
        drawLines(points, dashed) {
            if (dashed === 'dashed') {
                this.ctx.save();
                this.ctx.setLineDash([10, 5]);
                this.connectTheDots(points);
                // draw white on top for the case where the leaf faces are a solid color
                this.ctx.strokeStyle = "white";
                this.ctx.setLineDash([0, 10, 5, 0]);
                this.connectTheDots(points);
                this.ctx.restore();
            }
            else {
                this.connectTheDots(points);
            }
        }
        connectTheDots(points) {
            this.ctx.beginPath();
            points.forEach((p, i) => {
                i === 0 ? this.ctx.moveTo(p.x, p.y) : this.ctx.lineTo(p.x, p.y);
            });
            this.ctx.stroke();
        }
        drawPolygon(points, fill) {
            this.ctx.beginPath();
            points.forEach((p, i) => {
                i === 0 ? this.ctx.moveTo(p.x, p.y) : this.ctx.lineTo(p.x, p.y);
            });
            this.ctx.closePath();
            if (fill === "fill") {
                this.ctx.fill();
            }
        }
        drawCircle(center, radius) {
            this.ctx.beginPath();
            this.ctx.ellipse(center.x, center.y, radius, radius, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        drawText(text, x, y) {
            this.ctx.fillText(text, x, y);
        }
    }
    Flexagonator.PaintCanvas = PaintCanvas;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** interface for drawing flexagons using SVG */
    class PaintSvg {
        constructor(container) {
            this.container = container;
            this.lineWidth = 1.5;
            this.lineColor = "black";
            this.fillColor = "black";
            this.textColor = "black";
            this.textSize = 10;
            this.textBaseline = "bottom";
            this.textAnchor = "start";
            const [w, h] = this.getSize();
            this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            this.svg.setAttribute("viewBox", `0 0 ${w + 2} ${h + 2}`);
            this.svg.setAttribute("width", w.toString());
            this.svg.setAttribute("height", h.toString());
        }
        start(dontClear) {
            if (dontClear !== "dontClear") {
                this.container.innerHTML = ""; // remove previous svg content
            }
        }
        end() {
            this.container.appendChild(this.svg);
        }
        getSize() {
            // use container.style.width/height if present, else use container.width/height
            const style = this.container.style;
            const width = style && style.width && style.width.length ? style.width : this.container.getAttribute("width");
            const height = style && style.height && style.height.length ? style.height : this.container.getAttribute("height");
            // take off a couple pixels so there's room for thick lines at the edges
            const useWidth = width === null ? 400 : Number.parseInt(width) - 2;
            const useHeight = height === null ? 400 : Number.parseInt(height) - 2;
            return [useWidth, useHeight];
        }
        setLineColor(color) {
            this.lineColor = Flexagonator.colorAsHtmlString(color);
        }
        setFillColor(color) {
            this.fillColor = Flexagonator.colorAsHtmlString(color);
        }
        setTextColor(color) {
            this.textColor = Flexagonator.colorAsHtmlString(color);
        }
        setTextSize(pixels) {
            this.textSize = pixels;
        }
        setTextVertical(align) {
            this.textBaseline = align;
        }
        setTextHorizontal(align) {
            this.textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
        }
        // <path d="M x,y x,y" />
        drawLines(points, dashed) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const pstr = points.map(p => `${p.x.toString()},${p.y.toString()}`);
            const d = `M ${pstr.join(' ')}`;
            path.setAttribute("d", d);
            path.setAttribute("stroke", this.lineColor);
            path.setAttribute("stroke-width", this.lineWidth.toString());
            path.setAttribute("fill", "none");
            if (dashed === "dashed") {
                path.setAttribute("stroke-dasharray", "10,5");
            }
            this.svg.appendChild(path);
        }
        // <polygon points="x,y x,y" />
        drawPolygon(points, fill) {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const pstr = points.map(p => `${p.x.toString()},${p.y.toString()}`);
            const p = `${pstr.join(' ')}`;
            polygon.setAttribute("points", p);
            if (fill === "fill") {
                polygon.setAttribute("fill", this.fillColor.toString());
            }
            else {
                polygon.setAttribute("stroke", this.lineColor);
                polygon.setAttribute("stroke-width", this.lineWidth.toString());
                polygon.setAttribute("fill", "none");
            }
            this.svg.appendChild(polygon);
        }
        // <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" />
        drawCircle(center, radius) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", center.x.toString());
            circle.setAttribute("cy", center.y.toString());
            circle.setAttribute("r", radius.toString());
            circle.setAttribute("stroke", this.lineColor);
            circle.setAttribute("stroke-width", this.lineWidth.toString());
            circle.setAttribute("fill", "none");
            this.svg.appendChild(circle);
        }
        // <text x="" y="">text</text>
        drawText(str, x, y) {
            if (str[0] === ' ') {
                // workaround for leading space being dropped in xml
                x += this.textSize * 0.3;
            }
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x.toString());
            text.setAttribute("y", y.toString());
            text.textContent = str;
            text.setAttribute("font-size", this.textSize.toString());
            text.setAttribute("font-family", "sans-serif");
            text.setAttribute("fill", this.textColor);
            text.setAttribute("text-anchor", this.textAnchor.toString());
            if (this.textBaseline === "middle") {
                text.setAttribute("dominant-baseline", "middle");
            }
            this.svg.appendChild(text);
        }
    }
    Flexagonator.PaintSvg = PaintSvg;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // class that can build up a list of script buttons
    class ButtonsBuilder {
        constructor() {
            this.buttons = [];
        }
        addFlexButton(box, flexes) {
            this.buttons.push({ box: box, script: { flexes: flexes } });
        }
        create() {
            const buttons = this.buttons;
            this.buttons = [];
            return new ScriptButtons(buttons);
        }
    }
    Flexagonator.ButtonsBuilder = ButtonsBuilder;
    // regions that will trigger a script command when asked
    class ScriptButtons {
        constructor(buttons) {
            this.buttons = buttons;
        }
        findButton(x, y) {
            for (const button of this.buttons) {
                const box = button.box;
                if (box.x <= x && x <= box.x + box.w && box.y <= y && y <= box.y + box.h) {
                    return button.script;
                }
            }
            return null;
        }
    }
    Flexagonator.ScriptButtons = ScriptButtons;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** possibly flip the flexagon and rotate 'rightSteps',
      then check which flexes can be performed at the current hinge */
    function checkForFlexesAtHinge(flexagon, allFlexes, flexesToSearch, flip, rightSteps, ignoreStructure) {
        let modified = flexagon;
        if (flip) {
            modified = allFlexes["^"].apply(modified);
        }
        for (let i = 0; i < rightSteps; i++) {
            modified = allFlexes[">"].apply(modified);
        }
        return checkForFlexes(modified, flexesToSearch, ignoreStructure);
    }
    Flexagonator.checkForFlexesAtHinge = checkForFlexesAtHinge;
    /** get the list of all flexes that can be performed at the current hinge */
    function checkForFlexes(flexagon, flexes, ignoreStructure) {
        let results = [];
        for (let key of Object.keys(flexes)) {
            const flex = flexes[key];
            if ((ignoreStructure || flexagon.hasPattern(flex.input)) && flexagon.hasDirections(flex.inputDirs)) {
                results.push(key);
            }
        }
        return results;
    }
    Flexagonator.checkForFlexes = checkForFlexes;
    /** find every flex that could be supported for at least one hinge, checking only pat directions, not pat structure */
    function checkForPossibleFlexes(flexagon, allFlexes, flexesToSearch) {
        // if pats all go /, rule out any flexes with \
        if (flexagon.hasSameDirections()) {
            const results = [];
            for (const key of Object.keys(flexesToSearch)) {
                const flex = flexesToSearch[key];
                if (!flex.inputDirs || flex.inputDirs.asRaw().indexOf(false) === -1) {
                    results.push(key);
                }
            }
            return results;
        }
        // check every hinge on both sides to see if each flex works anywhere
        const supported = [];
        const patCount = flexagon.getPatCount();
        for (let i = 0; i < 2; i++) { // front & back
            for (let j = 0; j < patCount; j++) { // every hinge
                const set = checkForFlexesAtHinge(flexagon, allFlexes, flexesToSearch, i === 1, j, true);
                set.forEach(f => { if (supported.indexOf(f) === -1)
                    supported.push(f); });
            }
        }
        return supported;
    }
    Flexagonator.checkForPossibleFlexes = checkForPossibleFlexes;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // add new flexes to old, consolidating redundant rotates
    // and return the new list (which could be shorter)
    function addAndConsolidate(oldFlexes, newFlexes, numPats) {
        const oldLen = oldFlexes.length;
        const newLen = newFlexes.length;
        if (oldLen === 0 || newLen === 0) {
            return oldFlexes.concat(newFlexes);
        }
        const allflexes = oldFlexes.slice();
        const oldRotates = [];
        // move trailing rotates from oldFlexes to rotates
        for (let i = oldLen - 1; i >= 0; i--) {
            if (!isRotate(oldFlexes[i])) {
                break;
            }
            oldRotates.push(allflexes.pop());
        }
        const rotates = oldRotates.reverse();
        // move leading rotates from newFlexes to rotates
        let moved = newLen;
        for (let i = 0; i < newLen; i++) {
            if (!isRotate(newFlexes[i])) {
                moved = i;
                break;
            }
            rotates.push(newFlexes[i]);
        }
        // simplify & put it all together
        const simpler = simplify(rotates, numPats);
        const result = allflexes.concat(simpler).concat(newFlexes.slice(moved));
        return result;
    }
    Flexagonator.addAndConsolidate = addAndConsolidate;
    function isRotate(flexName) {
        return flexName.fullName === '>' || flexName.fullName === '<' || flexName.fullName === '^' || flexName.flexName === '~';
    }
    function simplify(flexNames, numPats) {
        // figure out what all those rotates do
        let flipped = false;
        const where = flexNames.reduce((prev, current) => {
            if (current.flexName === '>') {
                return flipped ? prev - 1 : prev + 1;
            }
            else if (current.flexName === '<') {
                return flipped ? prev + 1 : prev - 1;
            }
            else {
                flipped = !flipped;
                return prev;
            }
        }, 0);
        if (where === 0) {
            return flipped ? [Flexagonator.makeFlexName('^')] : [];
        }
        // come up with the shortest description
        let left = (where < 0);
        let steps = (Math.abs(where) % numPats);
        if (steps > Math.floor((numPats + 1) / 2)) {
            steps = steps - numPats;
            if (steps < 0) {
                left = !left;
                steps = -steps;
            }
        }
        // describe them in a simple form
        const result = [];
        const name = Flexagonator.makeFlexName(left ? '<' : '>');
        for (let i = 0; i < steps; i++) {
            result.push(name);
        }
        if (flipped) {
            result.push(Flexagonator.makeFlexName('^'));
        }
        return result;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * create a flex that only impacts a portion of a flexagon,
     * specify pats & directions to the left & right of the current hinge
     * @param patsNeeded number of pats that are unaffected by the flex
     * @param nextId first leaf id to use for the unaffected pats
     * @param rotation how the angles in the first pat after the current hinge get rotated
     * @param shiftDirs shift directions this many hinges to right (or left if <0)
     */
    function createLocalFlex(name, patsNeeded, nextId, inPatLeft, inPatRight, outPatLeft, outPatRight, inDirLeft, inDirRight, outDirLeft, outDirRight, rotation, shiftDirs) {
        const patCount = inPatLeft.length + patsNeeded + inPatRight.length;
        const input = createLeafTree(patsNeeded, nextId, inPatLeft, inPatRight);
        const output = createLeafTree(patsNeeded, nextId, outPatLeft, outPatRight);
        const inputDirs = createDirectionsOpt(patsNeeded, inDirLeft, inDirRight);
        const outputDirs = createDirectionsOpt(patsNeeded, outDirLeft, outDirRight);
        const fr = rotation === undefined ? Flexagonator.FlexRotation.None : rotation;
        const orderOfDirs = createOrderOfDirs(patCount, shiftDirs);
        return Flexagonator.makeFlex(name, input, output, fr, inputDirs, outputDirs, orderOfDirs);
    }
    Flexagonator.createLocalFlex = createLocalFlex;
    /** make [<right>, nextId, nextId+1..., <left>] so current hinge is between left & right */
    function createLeafTree(patsNeeded, nextId, left, right) {
        let pats = right;
        for (let i = nextId; i < nextId + patsNeeded; i++) {
            pats = pats.concat(i);
        }
        return pats.concat(left);
    }
    /** flex out the directions for the entire flexagon: right + ?'s + left */
    function createDirectionsOpt(patsNeeded, inDirLeft, inDirRight) {
        if (inDirLeft === undefined || inDirRight === undefined) {
            return undefined;
        }
        const dirs = inDirRight + '?'.repeat(patsNeeded) + inDirLeft;
        return dirs;
    }
    /** shift directions this many hinges to right (or left if <0) */
    function createOrderOfDirs(patCount, shiftDirs) {
        if (!shiftDirs) {
            return undefined;
        }
        const orderOfDirs = [];
        for (let i = 0; i < patCount; i++) {
            orderOfDirs.push((i + shiftDirs + patCount) % patCount + 1);
        }
        return orderOfDirs;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** simplify various tasks around creating flexagons & figuring out their properties */
    class Creator {
        /** pass colors to use when creating flexagons, initializes a default straight-strip hexa-hexaflexagon */
        constructor(colors) {
            this.colors = colors;
            this.interestingFlexes = [];
            this.primeFlexes = '';
            this.pieces = { patsPrefix: 6 };
            this.generator = Flexagonator.straightHexaGenerator;
            const script = [
                { flexes: this.generator },
                { normalizeIds: true, labelAsTree: colors }
            ];
            this.fm = Flexagonator.createFromScript(script);
            this.interestingFlexes = findInterestingFlexes(this.fm);
            this.primeFlexes = Flexagonator.filterToPrime(this.interestingFlexes, 6).join(' ');
        }
        getFlexagonManager() {
            return this.fm;
        }
        /** get the name of the current flexagon */
        getName() {
            let name = Flexagonator.namePiecesToName(this.pieces);
            if (this.generator) {
                name += ` (generator: ${this.generator})`;
            }
            if (this.pats) {
                name += ` (pats: ${JSON.stringify(this.pats)})`;
            }
            return name;
        }
        getSimpleName() { return Flexagonator.namePiecesToName(this.pieces); }
        getGenerator() { return this.generator; }
        getCreationPats() { return this.pats; }
        /** get all 3 leaf angles as a string with n significant digits */
        getLeafAngles(n) {
            const angles = this.fm.getAngleInfo().getAngles(this.fm.flexagon);
            const twoDigits = angles.map(a => a === Math.trunc(a) ? a.toString() : a.toPrecision(n));
            return `[${twoDigits.join(', ')}]`;
        }
        /** get the directions between pats */
        getDirections() {
            const dirs = this.fm.getDirections();
            return !dirs ? '' : dirs.asString(false);
        }
        /** get a list of flexes to display in the UI */
        getInterestingFlexes() {
            return this.interestingFlexes;
        }
        /** get a flexagonator script that can create the current flexagon */
        getCreationScript() {
            const script = this.makeNewFlexagonScript();
            if (script.length === 0) {
                return '';
            }
            const content = script.map(item => JSON.stringify(item));
            const text = `[\n${content.join(',\n')}\n]`;
            return text;
        }
        runScriptItem(script) {
            const result = Flexagonator.runScriptItem(this.fm, script);
            if (Flexagonator.isError(result)) {
                return result;
            }
            this.fm = result;
            return true;
        }
        runScriptString(str) {
            const result = Flexagonator.runScriptString(this.fm, str);
            if (Flexagonator.isError(result)) {
                return result;
            }
            this.fm = result;
            return true;
        }
        /** use the given name pieces to generate subsequent flexagons */
        setNamePieces(pieces) {
            if (Flexagonator.namePiecesToScript(pieces)[1].length > 0) {
                return false; // not enough pieces to determine flexagon
            }
            // reset everything
            this.pieces = pieces;
            this.generator = undefined;
            this.pats = undefined;
            this.interestingFlexes = [];
            this.primeFlexes = '';
            const result = this.newFlexagon();
            if (result === true) { // figure out flexes to show in UI
                this.interestingFlexes = findInterestingFlexes(this.fm);
                this.primeFlexes = Flexagonator.filterToPrime(this.interestingFlexes, this.fm.flexagon.getPatCount()).join(' ');
                Flexagonator.runScriptItem(this.fm, { searchFlexes: this.primeFlexes });
            }
            return result;
        }
        /** create a new flexagon from a flex sequence */
        createFromSequence(flexes) {
            this.generator = flexes;
            this.pats = undefined;
            return this.newFlexagon();
        }
        /** create a new flexagon from a description of the pats to use */
        createFromPats(rawPats) {
            const n = Flexagonator.getPatsPrefixAsNumber(this.pieces.patsPrefix);
            if (n === null) {
                return false;
            }
            const parsed = Flexagonator.parsePats(rawPats, n);
            if (!parsed) {
                return { reason: Flexagonator.TreeCode.ParseError, context: rawPats };
            }
            this.pats = parsed;
            this.generator = undefined;
            return this.newFlexagon();
        }
        /**
         * create a flexagon given the current creation setting
         * @returns true for success, false if name is incomplete, or specific error
         */
        newFlexagon() {
            const script = this.makeNewFlexagonScript();
            if (script.length === 0) {
                return false; // insufficient info, so nothing changed
            }
            // create flexagon
            const result = Flexagonator.createFromScript(script);
            if (Flexagonator.isError(result)) {
                return result; // report specific error
            }
            this.fm = result;
            return true; // success
        }
        /**
         * make a script that will create a flexagon given the current creation setting
         * @returns full script needed to create flexagon, or empty script if not enough information
         */
        makeNewFlexagonScript() {
            // check if name is complete enough
            const [, errors] = Flexagonator.namePiecesToScript(this.pieces);
            if (errors.length > 0) {
                return []; // insufficient info, don't create a script
            }
            const name = Flexagonator.namePiecesToName(this.pieces);
            // build up complete script for creating flexagon
            const script = [];
            script.push({ name });
            script.push({ addMorphFlexes: true });
            if (this.generator) {
                script.push({ flexes: this.generator, history: 'clear' });
            }
            else if (this.pats) {
                script.push({ pats: this.pats });
            }
            script.push({ labelAsTree: this.colors }); // label & color
            if (this.primeFlexes.length > 0) {
                script.push({ searchFlexes: this.primeFlexes });
            }
            return script;
        }
    }
    Flexagonator.Creator = Creator;
    /** figure out which flexes can be used based on pat direction, not pat structure */
    function findInterestingFlexes(fm) {
        const flexes = {};
        const allNames = Object.getOwnPropertyNames(fm.allFlexes);
        allNames.forEach(name => {
            const c = name[0]; // ignore shifts & rotates
            if (c !== '>' && c !== '<' && c !== '^' && c !== '~') {
                flexes[name] = fm.allFlexes[name];
            }
        });
        const supported = Flexagonator.checkForPossibleFlexes(fm.flexagon, fm.allFlexes, flexes);
        return Flexagonator.filterToInteresting(supported);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** understands the directions between adjacent pats or leaves */
    class Directions {
        /**
         * how each pat is connected to the previous pat;
         * either as a string - \: up, /: down, assuming previous to left
         * or array - false: left or up, true: right or down
         */
        static make(input) {
            if (typeof input !== 'string') {
                return new Directions(input);
            }
            const directions = [];
            for (let i = 0; i < input.length; i++) {
                directions.push(input[i] === '/');
            }
            return new Directions(directions);
        }
        constructor(directions) {
            this.directions = directions;
        }
        /** does the pat after the ith pat go to the lower right if previous was to the left? */
        isDown(i) { return this.directions[i]; }
        getCount() { return this.directions.length; }
        /** if 'jsonFriendly', use | instead of \ so escaping doesn't obfuscate the patterns */
        asString(jsonFriendly) {
            return jsonFriendly
                ? this.directions.map(d => d ? '/' : '|').join('')
                : this.directions.map(d => d ? '/' : '\\').join('');
        }
        asRaw() { return this.directions; }
    }
    Flexagonator.Directions = Directions;
    /** used to specify optional directions between adjacent pats or leaves */
    class DirectionsOpt {
        /**
         * how each pat is connected to the previous pat;
         * either as a string - \: up, /: down, ?:don't care, assuming previous to left
         * or array - false: left or up, true: right or down, null: don't care
         */
        static make(input) {
            if (typeof input !== 'string') {
                return new DirectionsOpt(input);
            }
            const directions = [];
            for (let i = 0; i < input.length; i++) {
                switch (input[i]) {
                    case '?':
                        directions.push(null);
                        break;
                    case '/':
                    case '|':
                    case '\\':
                        directions.push(input[i] === '/');
                        break;
                    default:
                        return null;
                }
            }
            return new DirectionsOpt(directions);
        }
        constructor(directions) {
            this.directions = directions;
        }
        getCount() { return this.directions.length; }
        /** if 'jsonFriendly', use | instead of \ so escaping doesn't obfuscate the patterns */
        asString(jsonFriendly) {
            return jsonFriendly
                ? this.directions.map(d => d === null ? '?' : d ? '/' : '|').join('')
                : this.directions.map(d => d === null ? '?' : d ? '/' : '\\').join('');
        }
        asRaw() { return this.directions; }
    }
    Flexagonator.DirectionsOpt = DirectionsOpt;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // check if this is one of the errors Flexagonator can signal
    function isError(result) {
        return isTreeError(result) || isPatternError(result) || isFlexError(result);
    }
    Flexagonator.isError = isError;
    // get details about an error
    function errorToString(error) {
        if (isTreeError(error)) {
            let str = "Tree Error: " + error.reason;
            if (error.context) {
                str += " with context " + error.context.toString();
            }
            return str;
        }
        else if (isPatternError(error)) {
            let str = "Error in flex pattern definition; ";
            if (error.expected && error.actual) {
                str += "expected '" + error.expected.toString()
                    + "' but found '" + error.actual.toString() + "'";
            }
            if (error.expectedDirs && error.actualDirs) {
                str += "expected '" + error.expectedDirs.asString(false)
                    + "' but found '" + error.actualDirs.asString(false) + "'";
            }
            return str;
        }
        else if (isFlexError(error)) {
            let str = "Flex Error: " + error.reason;
            if (error.flexName) {
                str += " for flex " + error.flexName;
            }
            if (error.patternError) {
                str += " because of " + errorToString(error.patternError);
            }
            return str;
        }
        return "no error";
    }
    Flexagonator.errorToString = errorToString;
    /*
      Error parsing a leaf tree when creating a pat or flexagon
    */
    let TreeCode;
    (function (TreeCode) {
        TreeCode["LeafIdMustBeInt"] = "leaf id must be an integer";
        TreeCode["ArrayMustHave2Items"] = "array must have 2 items";
        TreeCode["TooFewPats"] = "too few pats";
        TreeCode["ExpectedArray"] = "expected array";
        TreeCode["ErrorInSubArray"] = "error in subarray";
        TreeCode["ParseError"] = "parse error";
    })(TreeCode = Flexagonator.TreeCode || (Flexagonator.TreeCode = {}));
    function isTreeError(result) {
        return result && result.context !== undefined;
    }
    Flexagonator.isTreeError = isTreeError;
    function isPatternError(result) {
        return result && (result.expected !== undefined
            || result.expectedDirs !== undefined);
    }
    Flexagonator.isPatternError = isPatternError;
    /** Error performing a flex on a flexagon */
    let FlexCode;
    (function (FlexCode) {
        FlexCode["SizeMismatch"] = "size mismatch";
        FlexCode["BadFlexInput"] = "bad flex input";
        FlexCode["BadFlexOutput"] = "bad flex output";
        FlexCode["UnknownFlex"] = "unknown flex";
        FlexCode["CantApplyFlex"] = "cant apply flex";
        FlexCode["BadDirections"] = "bad pat directions";
    })(FlexCode = Flexagonator.FlexCode || (Flexagonator.FlexCode = {}));
    function isFlexError(result) {
        return result && result.reason !== undefined;
    }
    Flexagonator.isFlexError = isFlexError;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * if the first leaf after the reference hinge has angles ABC
     *  (A in the center/lower & B counterclockwise),
     * this describes the new arrangement of angles after a given flex
     */
    let FlexRotation;
    (function (FlexRotation) {
        FlexRotation["None"] = "ABC";
        FlexRotation["ACB"] = "ACB";
        FlexRotation["BAC"] = "BAC";
        FlexRotation["BCA"] = "BCA";
        FlexRotation["CAB"] = "CAB";
        FlexRotation["CBA"] = "CBA";
        FlexRotation["Right"] = "Right";
        FlexRotation["Left"] = "Left";
    })(FlexRotation = Flexagonator.FlexRotation || (Flexagonator.FlexRotation = {}));
    /*
      Takes a pattern as input (length matches the pat count in the target flexagon)
        and an output pattern that references the labels from the input pattern,
        with negative numbers indicating that the matching pat should be flipped
      e.g. input:  [1, [2, 3], 4, [5, 6]]
           output: [[-5, 1], -2, [4, -3], -6]
      specifying pat directions is optional, with two techniques:
        inputDirs: use when input dirs must match a given pattern
        outputDirs: use when flex has specific pat directions as its output
        orderOfDirs: use if directions get rearranged, e.g., > or ^
    */
    function makeFlex(name, input, output, fr, inputDirs, outputDirs, orderOfDirs) {
        if (input.length !== output.length
            || (inputDirs !== undefined && input.length !== inputDirs.length)
            || (outputDirs !== undefined && input.length !== outputDirs.length)
            || (orderOfDirs !== undefined && input.length !== orderOfDirs.length)) {
            return { reason: Flexagonator.FlexCode.SizeMismatch };
        }
        const inDirections = inputDirs ? Flexagonator.DirectionsOpt.make(inputDirs) : undefined;
        const outDirections = outputDirs ? Flexagonator.DirectionsOpt.make(outputDirs) : undefined;
        if (inDirections === null || outDirections === null) {
            return { reason: Flexagonator.FlexCode.BadDirections };
        }
        return new Flex(name, input, output, fr, inDirections, outDirections, orderOfDirs);
    }
    Flexagonator.makeFlex = makeFlex;
    /*
      Manages flexing a flexagon.
    */
    class Flex {
        constructor(name, input, output, rotation, 
        /** flexagon must be connected with these directions for flex to work */
        inputDirs, 
        /** specific pat directions for output flexagon */
        outputDirs, 
        /** old directions get rearranged, specify new order for old directions, 1-based */
        orderOfDirs) {
            this.name = name;
            this.input = input;
            this.output = output;
            this.rotation = rotation;
            this.inputDirs = inputDirs;
            this.outputDirs = outputDirs;
            this.orderOfDirs = orderOfDirs;
            // check if flex will change a flexagon that's all ////'s
            const hasOutputDirs = outputDirs ? outputDirs.asRaw().some((d) => d === false) : false;
            const hasChangeDirs = orderOfDirs ? orderOfDirs.some(e => e < 0) : false;
            this.needsDirections = hasOutputDirs || hasChangeDirs;
        }
        createInverse() {
            return new Flex("inverse " + this.name, this.output, this.input, this.invertRotation(this.rotation), this.outputDirs, this.inputDirs, this.invertOrderOfDirs(this.orderOfDirs));
        }
        // apply this flex to the given flexagon
        apply(flexagon) {
            const matches = flexagon.matchPattern(this.input, this.inputDirs);
            if (Flexagonator.isPatternError(matches)) {
                return { reason: Flexagonator.FlexCode.BadFlexInput, patternError: matches };
            }
            const newPats = [];
            for (let stack of this.output) {
                const newPat = this.createPat(stack, matches);
                if (Flexagonator.isFlexError(newPat)) {
                    return newPat;
                }
                newPats.push(newPat);
            }
            const angleTracker = this.newAngleTracker(flexagon);
            const directions = this.newDirections(flexagon.directions);
            return new Flexagonator.Flexagon(newPats, angleTracker, directions);
        }
        newAngleTracker(flexagon) {
            const tracker = flexagon.angleTracker;
            const nextPrevDirs = this.getAdjacentDirections(flexagon.directions);
            const corners = tracker.rotate(this.rotation, nextPrevDirs);
            // deprecated info
            const oldWhich = this.getOldCorner(tracker.oldCorner, tracker.oldIsMirrored);
            const mirrored = (this.rotation == FlexRotation.None) ? tracker.oldIsMirrored : !tracker.oldIsMirrored;
            return Flexagonator.AngleTracker.make(corners, mirrored, oldWhich);
        }
        /** get [next direction, previous direction], where true=/ and false=\ */
        getAdjacentDirections(directions) {
            if (directions === undefined) {
                return [true, true];
            }
            const all = directions.asRaw();
            return [all[0], all[all.length - 1]];
        }
        newDirections(directions) {
            if (directions === undefined) {
                if (!this.needsDirections || !this.outputDirs) {
                    return undefined;
                }
                // flexagon didn't have directions, but the flex needs them
                const raw = this.outputDirs.asRaw().map(_ => true);
                directions = Flexagonator.Directions.make(raw);
            }
            // explicitly set new directions
            if (this.outputDirs !== undefined) {
                const flexDirs = this.outputDirs.asRaw();
                const oldDirs = directions.asRaw();
                const newDirs = [];
                for (let i = 0; i < oldDirs.length; i++) {
                    const flexDir = flexDirs[i];
                    if (flexDir === null || flexDir === undefined) {
                        // flex preserves old direction
                        newDirs.push(oldDirs[i]);
                    }
                    else {
                        // use flex's explicit direction
                        newDirs.push(flexDir);
                    }
                }
                directions = Flexagonator.Directions.make(newDirs);
            }
            // rearrange directions
            if (this.orderOfDirs !== undefined) {
                // e.g., [2,3,1] means that the 2nd direction should now be first, followed by the 3rd & 1st
                // e.g., [1,-2,3] says to flip the 2nd direction
                const oldRaw = directions.asRaw();
                const newRaw = this.orderOfDirs.map(newIndex => newIndex > 0 ? oldRaw[newIndex - 1] : !oldRaw[-newIndex - 1]);
                directions = Flexagonator.Directions.make(newRaw);
            }
            return directions;
        }
        invertRotation(fr) {
            switch (fr) {
                case FlexRotation.ACB: return FlexRotation.ACB;
                case FlexRotation.BAC: return FlexRotation.BAC;
                case FlexRotation.BCA: return FlexRotation.CAB;
                case FlexRotation.CAB: return FlexRotation.BCA;
                case FlexRotation.CBA: return FlexRotation.CBA;
                case FlexRotation.Right: return FlexRotation.Left;
                case FlexRotation.Left: return FlexRotation.Right;
            }
            return FlexRotation.None;
        }
        invertOrderOfDirs(order) {
            if (order === undefined) {
                return undefined;
            }
            const newOrder = [];
            for (let i = 0; i < order.length; i++) {
                // this basically swaps i & order[i], adjusting for 1-based & negatives
                const newI = Math.abs(order[i]) - 1;
                const newVal = order[i] > 0 ? i + 1 : -(i + 1);
                newOrder[newI] = newVal;
            }
            return newOrder;
        }
        // create a pat given a tree of indices into a set of matched pats
        createPat(stack, matches) {
            if (typeof (stack) === "number") {
                const i = stack;
                const pat = matches[Math.abs(i)];
                return i > 0 ? pat.makeCopy() : pat.makeFlipped();
            }
            else if (Array.isArray(stack) && stack.length === 2) {
                const a = this.createPat(stack[0], matches);
                if (Flexagonator.isFlexError(a)) {
                    return a;
                }
                const b = this.createPat(stack[1], matches);
                if (Flexagonator.isFlexError(b)) {
                    return b;
                }
                return Flexagonator.combinePats(a, b);
            }
            return { reason: Flexagonator.FlexCode.BadFlexOutput };
        }
        /** deprecated: incorrectly supports a subset of rotations */
        getOldCorner(whichCorner, isFirstMirrored) {
            if (this.rotation === FlexRotation.None || this.rotation === FlexRotation.ACB) {
                return whichCorner;
            }
            if ((this.rotation === FlexRotation.CBA && !isFirstMirrored) ||
                (this.rotation === FlexRotation.BAC && isFirstMirrored)) {
                return (whichCorner + 1) % 3;
            }
            return (whichCorner + 2) % 3;
        }
        // generate the structure necessary to perform this flex, and keep track of new subpats
        // note: it doesn't actually apply the flex
        createPattern(flexagon) {
            const newPats = [];
            const splits = [];
            let nextId = flexagon.getLeafCount() + 1;
            for (let i in this.input) {
                const newPat = flexagon.pats[i].createPattern(this.input[i], () => { return nextId++; }, splits);
                newPats.push(newPat);
            }
            return [new Flexagonator.Flexagon(newPats, flexagon.angleTracker, flexagon.directions), splits];
        }
    }
    Flexagonator.Flex = Flex;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // apply a series of flexes, coloring & numbering faces whenever a * or + creates new structure
    function flexAndColor(fm, options) {
        const { flexes, colors } = options;
        const flexNames = Flexagonator.parseFlexSequence(flexes);
        const faceProps = new FaceSetter(colors ? colors : []);
        // first apply all the flexes so the proper structure is created,
        // and run them in reverse so we're back at the start
        const result = fm.applyFlexes(flexNames, false);
        if (Flexagonator.isFlexError(result)) {
            return result;
        }
        fm.applyInReverse(flexNames);
        // set properties on the front & back
        faceProps.setFaceProps(fm, true);
        faceProps.setFaceProps(fm, false);
        // now step through each flex, applying leaf properties for a * or +
        for (const flexName of flexNames) {
            if (flexName.shouldGenerate && flexName.shouldApply) {
                // e.g. P*
                fm.applyFlex(flexName);
                faceProps.setFaceProps(fm, true);
                faceProps.setFaceProps(fm, false);
            }
            else if (flexName.shouldGenerate && !flexName.shouldApply) {
                // e.g. P+
                fm.applyFlex(flexName.flexName); // e.g. P'
                faceProps.setFaceProps(fm, true);
                faceProps.setFaceProps(fm, false);
                fm.applyInReverse(flexName.flexName);
            }
            else {
                fm.applyFlex(flexName);
            }
        }
        return true;
    }
    Flexagonator.flexAndColor = flexAndColor;
    // used for stepping through the faces and numbering each one, optionally coloring
    class FaceSetter {
        constructor(colors) {
            this.colors = colors;
            this.n = 0;
        }
        setFaceProps(fm, front) {
            let anyset = fm.setUnsetFaceLabel((this.n + 1).toString(), front);
            if (this.n < this.colors.length) {
                if (fm.setUnsetFaceColor(this.colors[this.n], front)) {
                    anyset = true;
                }
            }
            if (anyset) {
                this.n++;
            }
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function makeFlexName(fullName) {
        const last = fullName[fullName.length - 1];
        const shouldGenerate = (last === '+') || (last === '*');
        const shouldApply = (last !== '+');
        let isInverse;
        let baseName;
        if (shouldGenerate) {
            const next = fullName[fullName.length - 2];
            isInverse = (next === "'");
            if (isInverse) {
                baseName = fullName.substring(0, fullName.length - 2);
            }
            else {
                baseName = fullName.substring(0, fullName.length - 1);
            }
        }
        else {
            isInverse = (last === "'");
            if (isInverse) {
                baseName = fullName.substring(0, fullName.length - 1);
            }
            else {
                baseName = fullName;
            }
        }
        return new FlexName(baseName, isInverse, shouldGenerate, shouldApply);
    }
    Flexagonator.makeFlexName = makeFlexName;
    // can interpret a string representing a flex, whether it's an inverse, etc.
    // '  inverse
    // +  generate necessary structure but don't apply
    // *  generate necessary structure and apply
    class FlexName {
        constructor(baseName, isInverse, shouldGenerate, shouldApply) {
            this.baseName = baseName;
            this.isInverse = isInverse;
            this.shouldGenerate = shouldGenerate;
            this.shouldApply = shouldApply;
            this.flexName = this.baseName;
            if (this.isInverse) {
                this.flexName += "'";
            }
            this.fullName = this.flexName;
            if (this.shouldGenerate) {
                if (this.shouldApply) {
                    this.fullName += "*";
                }
                else {
                    this.fullName += "+";
                }
            }
        }
        getInverse() {
            return new FlexName(this.baseName, !this.isInverse, this.shouldGenerate, this.shouldApply);
        }
        /** make the flex a generator - leave ^>< and + alone, otherwise add * */
        getGenerator() {
            const b = this.baseName;
            return this.shouldGenerate || b === '^' || b === '>' || b === '<' ? this : makeFlexName(`${this.flexName}*`);
        }
    }
    Flexagonator.FlexName = FlexName;
    // get a list of all the unique flex names (ingoring * and +, but including ')
    // and optionally excluding ><^~
    function getUniqueFlexes(flexStr, excludeRotates) {
        let result = [];
        const names = Flexagonator.parseFlexSequence(flexStr);
        for (let name of names) {
            const flexName = name.flexName;
            if (excludeRotates && (flexName == '<' || flexName == '>' || flexName == '^' || flexName == '~')) {
                continue;
            }
            if (result.find(x => (x === flexName)) === undefined) {
                result.push(flexName);
            }
        }
        return result;
    }
    Flexagonator.getUniqueFlexes = getUniqueFlexes;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /*
      Manages the pats in a flexagon
    */
    class Flexagon {
        constructor(pats, angleTracker, directions) {
            this.pats = pats;
            this.directions = directions;
            this.angleTracker = angleTracker === undefined ? AngleTracker.makeDefault() : angleTracker;
        }
        static makeFromTreeCheckZeros(trees) {
            const flexagon = this.makeFromTree(trees);
            if (Flexagonator.isTreeError(flexagon)) {
                return flexagon;
            }
            // find the largest id and replace all 0's in pats with an incremented counter
            let next = flexagon.pats.map(pat => pat.findMaxId()).reduce((prev, current) => Math.max(prev, current), 0) + 1;
            const result = flexagon.pats.map(pat => pat.replaceZeros(() => { return next++; }));
            return new Flexagon(result);
        }
        static makeFromTree(trees, angleTracker, directions) {
            if (trees.length < 2) {
                return { reason: Flexagonator.TreeCode.TooFewPats, context: trees };
            }
            const pats = trees.map(tree => Flexagonator.makePat(tree));
            const error = pats.find(pat => Flexagonator.isTreeError(pat));
            if (error && Flexagonator.isTreeError(error)) {
                return error;
            }
            return new Flexagon(pats, angleTracker, directions);
        }
        getPatCount() {
            return this.pats.length;
        }
        getLeafCount() {
            return this.pats.reduce((total, pat) => total + pat.getLeafCount(), 0);
        }
        getAsLeafTrees() {
            return this.pats.map(pat => pat.getAsLeafTree());
        }
        getTopIds() {
            return this.pats.map(pat => pat.getTop());
        }
        getBottomIds() {
            return this.pats.map(pat => pat.getBottom());
        }
        /** get the ids for the visible leaves [ [top1, top2...], [bottom1,  bottom2...] ] */
        getVisible() {
            return [this.getTopIds(), this.getBottomIds()];
        }
        getThicknesses() {
            return this.pats.map(pat => pat.getLeafCount());
        }
        /** check if flexagons are in the same state: pat structure, leaf ids, & directions */
        isSameState(other) {
            if (this.pats.length !== other.pats.length) {
                return false;
            }
            if (this.pats.some((p, i) => !p.isEqual(other.pats[i]))) {
                return false;
            }
            return this.hasEqualDirections(other);
        }
        /** check if flexagons have the same pat structure & directions, ignoring leaf ids */
        isSameStructure(other) {
            if (this.pats.length !== other.pats.length) {
                return false;
            }
            if (this.pats.some((p, i) => !p.isEqualStructure(other.pats[i]))) {
                return false;
            }
            return this.hasEqualDirections(other);
        }
        hasPattern(pattern) {
            if (this.pats.length !== pattern.length) {
                return false;
            }
            return this.pats.every((pat, i) => pat.hasPattern(pattern[i]));
        }
        /** check if the flexagon's pat directions match the given pattern */
        hasDirections(patternDirs) {
            if (!patternDirs || !this.directions) {
                return true;
            }
            if (patternDirs.getCount() !== this.directions.getCount()) {
                return false;
            }
            const expected = patternDirs.asRaw();
            const actual = this.directions.asRaw();
            let i = 0;
            for (const e of expected) {
                if (e !== null && e != actual[i]) {
                    return false;
                }
                i++;
            }
            return true;
        }
        /** check if flexagons have same pat directions */
        hasEqualDirections(other) {
            if (this.hasSameDirections() && other.hasSameDirections()) {
                return true;
            }
            else if (this.directions === undefined || other.directions === undefined) {
                return false;
            }
            return this.directions.asRaw().every((d, i) => { var _a; return d === ((_a = other.directions) === null || _a === void 0 ? void 0 : _a.asRaw()[i]); });
        }
        /** check if all pats go in the same direction */
        hasSameDirections() {
            if (!this.directions) {
                return true;
            }
            const raw = this.directions.asRaw();
            return raw.every(d => d) || raw.every(d => !d);
        }
        /** if pats & directions match, return a lookup from pattern leaf id to matching pat */
        matchPattern(pattern, patternDirs) {
            if (this.pats.length !== pattern.length) {
                return { expected: pattern, actual: this.pats };
            }
            // check pats & save matches
            const match = [];
            for (let i in this.pats) {
                const imatch = this.pats[i].matchPattern(pattern[i]);
                if (Flexagonator.isPatternError(imatch)) {
                    return imatch;
                }
                for (let j in imatch) {
                    match[j] = imatch[j];
                }
            }
            // verify that directions match
            if (!this.hasDirections(patternDirs)) {
                return { expectedDirs: patternDirs, actualDirs: this.directions };
            }
            return match;
        }
        /**
         * create a new flexagon where the leaves are renumbered
         * such that the ids are in the order they occur in the unfolded strip
         */
        normalizeIds() {
            const normalized = Flexagonator.normalizeIds(this.pats);
            return new Flexagon(normalized, this.angleTracker, this.directions);
        }
        changeDirections(directions) {
            return new Flexagon(this.pats, this.angleTracker, directions);
        }
    }
    Flexagonator.Flexagon = Flexagon;
    /**
     * tracks how the FlexagonAngles associated with a Flexagon should be used.
     * corners: array of 0,1,or 2 - lists which angle is center/lower, first clockwise, and final angle
     * isMirrored: for backward compat with the old API, if !isMirrored, angles are 012, else 021
     * oldAngle: for backward compat with the old API, same as 'whichAngle' except it's often wrong
     */
    class AngleTracker {
        static make(corners, oldIsMirrored, oldCorner) {
            return new AngleTracker(corners, oldIsMirrored, oldCorner !== undefined ? oldCorner : corners[0]);
        }
        static makeDefault() {
            return new AngleTracker([0, 1, 2], false, 0);
        }
        constructor(corners, oldIsMirrored, oldCorner) {
            this.corners = corners;
            this.oldIsMirrored = oldIsMirrored;
            this.oldCorner = oldCorner;
        }
        /** @param nextPrevDirs [next direction, previous direction], where true=/ and false=\ */
        rotate(fr, nextPrevDirs) {
            switch (fr) {
                case Flexagonator.FlexRotation.ACB: return this.apply(0, 2, 1);
                case Flexagonator.FlexRotation.BAC: return this.apply(1, 0, 2);
                case Flexagonator.FlexRotation.BCA: return this.apply(1, 2, 0);
                case Flexagonator.FlexRotation.CAB: return this.apply(2, 0, 1);
                case Flexagonator.FlexRotation.CBA: return this.apply(2, 1, 0);
                case Flexagonator.FlexRotation.Right:
                    return nextPrevDirs[0] ? this.apply(0, 2, 1) : this.apply(1, 0, 2);
                case Flexagonator.FlexRotation.Left:
                    return nextPrevDirs[1] ? this.apply(0, 2, 1) : this.apply(1, 0, 2);
            }
            return this.corners;
        }
        apply(a, b, c) {
            return [this.corners[a], this.corners[b], this.corners[c]];
        }
    }
    Flexagonator.AngleTracker = AngleTracker;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    let CenterAngle;
    (function (CenterAngle) {
        CenterAngle[CenterAngle["Is360"] = 0] = "Is360";
        CenterAngle[CenterAngle["GreaterThan360"] = 1] = "GreaterThan360";
        CenterAngle[CenterAngle["LessThan360"] = -1] = "LessThan360";
    })(CenterAngle = Flexagonator.CenterAngle || (Flexagonator.CenterAngle = {}));
    /** object that understand which angles to use for leaves
      when given a flexagon */
    class FlexagonAngles {
        /**
          angleCenter: angle in the center of the flexagon
          angleCounter:  angle counterclockwise from the center
          isDefault: is this a default set of angles or was it explicitly set?
          useCorrect: if false, use the deprecated way of tracking angles
        */
        constructor(angleCenter, angleCounter, isDefault, useCorrect) {
            this.angleCenter = angleCenter;
            this.angleCounter = angleCounter;
            this.isDefault = isDefault;
            this.useCorrect = useCorrect;
        }
        static makeDefault() {
            return new FlexagonAngles(60, 60, true, true /*useCorrect*/);
        }
        /** center angle, angle in counterclockwise direction, useCorrect:false for deprecated behavior */
        static makeAngles(angleCenter, angleCounter, useCorrect) {
            return new FlexagonAngles(angleCenter, angleCounter, false, useCorrect);
        }
        static makeIsosceles(flexagon, useCorrect) {
            const center = 360 / flexagon.getPatCount();
            const clock = (180 - center) / 2;
            return new FlexagonAngles(center, clock, false, useCorrect);
        }
        // [center angle, clockwise, clockwise]
        getAngles(flexagon) {
            const angles = [this.angleCenter, this.angleCounter, 180 - this.angleCenter - this.angleCounter];
            if (this.useCorrect) {
                const v = flexagon.angleTracker.corners;
                return [angles[v[0]], angles[v[1]], angles[v[2]]];
            }
            else {
                const v = flexagon.angleTracker.oldCorner;
                if (flexagon.angleTracker.oldIsMirrored) {
                    return [angles[v], angles[(v + 2) % 3], angles[(v + 1) % 3]];
                }
                return [angles[v], angles[(v + 1) % 3], angles[(v + 2) % 3]];
            }
        }
        getCenterAngleSum(flexagon) {
            const angles = this.getAngles(flexagon);
            const angle = angles[0] * flexagon.getPatCount();
            if (Math.round(angle) === 360) {
                return CenterAngle.Is360;
            }
            return (angle < 360) ? CenterAngle.LessThan360 : CenterAngle.GreaterThan360;
        }
        // get the angles along the edge of the 1st leaf that we'll reflect the 2nd leaf across
        getUnfoldedAngles(flexagon, unfolded) {
            return this.getAnglesUsingDirection(flexagon, unfolded[0].isClock);
        }
        // lower level version for testing
        getAnglesUsingDirection(flexagon, isClock) {
            const angles = this.getAngles(flexagon);
            return isClock ? [angles[1], angles[0], angles[2]] : [angles[2], angles[1], angles[0]];
        }
    }
    Flexagonator.FlexagonAngles = FlexagonAngles;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /*
      Manages a flexagon, its valid flexes, & applying flexes
    */
    class FlexagonManager {
        constructor(flexagon, leafProps, useFlexes) {
            this.interpolateNewLeaves = undefined;
            this.angleInfo = Flexagonator.FlexagonAngles.makeDefault();
            this.flexagon = flexagon;
            this.leafProps = new Flexagonator.PropertiesForLeaves(leafProps);
            this.allFlexes = useFlexes ? useFlexes : Flexagonator.makeAllFlexes(flexagon.getPatCount(), flexagon.hasDirections());
            this.flexesToSearch = Flexagonator.getPrimeFlexes(this.allFlexes, flexagon.getPatCount());
            this.setIsosceles(true);
            this.tracker = Flexagonator.Tracker.make(flexagon);
            this.history = new Flexagonator.History(flexagon, this.tracker.getCopy());
        }
        /** assume an isosceles flexagon where pats meet in the middle */
        static make(flexagon, leafProps) {
            return new FlexagonManager(flexagon, leafProps);
        }
        /** assume 'flexagon' only contains pats so we should borrow other info from 'other' if appropriate */
        static makeFromPats(flexagon, other) {
            if (other && other.flexagon.directions && other.flexagon.directions.getCount() === flexagon.getPatCount()) {
                flexagon = flexagon.changeDirections(other.flexagon.directions);
            }
            const samePatCount = other && flexagon.getPatCount() === other.flexagon.getPatCount();
            // only keep the same flexes if the pat count matches
            const flexes = samePatCount ? other.allFlexes : undefined;
            const fm = new FlexagonManager(flexagon, undefined, flexes);
            if (other && !other.angleInfo.isDefault && samePatCount) {
                fm.angleInfo = other.angleInfo;
            }
            return fm;
        }
        /**
         * apply a single flex;
         * if the flex string ends with +, generate the needed structure
         * if the flex string ends with *, generate the needed structure & apply the flex
         */
        applyFlex(flexStr) {
            const flexName = (typeof (flexStr) === 'string') ? Flexagonator.makeFlexName(flexStr) : flexStr;
            const result = this.rawApplyFlex(flexName);
            if (Flexagonator.isFlexError(result)) {
                return result;
            }
            this.history.add([flexName], this.flexagon, this.tracker.getCopy());
            return true;
        }
        /**
         * apply a series of flexes, e.g. "P > > S'+ ^ T"
         * as a single undoable operation
         */
        applyFlexes(flexStr, separatelyUndoable) {
            const flexNames = (typeof (flexStr) === 'string') ? Flexagonator.parseFlexSequence(flexStr) : flexStr;
            let count = 0;
            for (const flexName of flexNames) {
                const result = separatelyUndoable ? this.applyFlex(flexName) : this.rawApplyFlex(flexName);
                if (Flexagonator.isFlexError(result)) {
                    if (separatelyUndoable) {
                        for (let i = 0; i < count; i++) {
                            this.history.undo();
                        }
                    }
                    return { reason: Flexagonator.FlexCode.CantApplyFlex, flexName: flexName.fullName };
                }
                count++;
            }
            if (!separatelyUndoable) {
                this.history.add(flexNames, this.flexagon, this.tracker.getCopy());
            }
            return true;
        }
        /** run the inverse of the flexes backwards to effectively undo a sequence */
        applyInReverse(flexStr) {
            // note: the call to map makes a copy so .reverse() won't modify the parameter passed to the function
            const forwardFlexNames = (typeof (flexStr) === 'string') ? Flexagonator.parseFlexSequence(flexStr) : flexStr.map(f => f);
            const flexNames = forwardFlexNames.reverse();
            const inverseArray = flexNames.map(flexName => flexName.shouldApply ? flexName.getInverse().fullName : '');
            const inverses = inverseArray.join(' ');
            return this.applyFlexes(inverses, false);
        }
        /** apply a flex without adding it to the history list */
        rawApplyFlex(flexName) {
            const name = flexName.flexName;
            const flex = this.allFlexes[name];
            if (flex === undefined) {
                return { reason: Flexagonator.FlexCode.UnknownFlex, flexName: name };
            }
            if (flexName.shouldGenerate && !this.flexagon.hasDirections(flex.inputDirs)) {
                return { reason: Flexagonator.FlexCode.CantApplyFlex, flexName: name };
            }
            const [input, splits] = flexName.shouldGenerate
                ? flex.createPattern(this.flexagon)
                : [this.flexagon, []];
            const result = flexName.shouldApply ? flex.apply(input) : input;
            if (Flexagonator.isFlexError(result)) {
                return { reason: Flexagonator.FlexCode.CantApplyFlex, flexName: name };
            }
            if (this.interpolateNewLeaves === 'colorAndLabel' || this.interpolateNewLeaves === 'justColor') {
                splits.forEach(split => Flexagonator.interpolateLeaves(split, this.leafProps, this.interpolateNewLeaves === 'colorAndLabel'));
            }
            else {
                splits.forEach(split => this.leafProps.adjustForSplit(split.getTop(), split.getBottom()));
            }
            if (flexName.shouldGenerate && this.flexagon.getLeafCount() !== result.getLeafCount()) {
                // whenever we add new structure, start tracking over again
                this.tracker = Flexagonator.Tracker.make(result);
            }
            else {
                this.tracker.findMaybeAdd(result);
            }
            this.flexagon = result;
            return true;
        }
        /** add a set of flexes to the list of possible flexes */
        addFlexes(flexes) {
            const keys = Object.getOwnPropertyNames(flexes);
            keys.forEach(key => this.allFlexes[key] = flexes[key]);
        }
        normalizeIds() {
            this.flexagon = this.flexagon.normalizeIds();
            // changing the ids impacts tracking & history, so reset
            this.clearHistory();
        }
        setFaceLabel(label, front) {
            const ids = front ? this.flexagon.getTopIds() : this.flexagon.getBottomIds();
            for (const id of ids) {
                this.leafProps.setLabelProp(id, label);
            }
        }
        setUnsetFaceLabel(label, front) {
            const ids = front ? this.flexagon.getTopIds() : this.flexagon.getBottomIds();
            let anyset = false;
            for (const id of ids) {
                if (this.leafProps.setUnsetLabelProp(id, label)) {
                    anyset = true;
                }
            }
            return anyset;
        }
        setFaceColor(color, front) {
            const ids = front ? this.flexagon.getTopIds() : this.flexagon.getBottomIds();
            for (const id of ids) {
                this.leafProps.setColorProp(id, color);
            }
        }
        setUnsetFaceColor(color, front) {
            const ids = front ? this.flexagon.getTopIds() : this.flexagon.getBottomIds();
            let anyset = false;
            for (const id of ids) {
                if (this.leafProps.setUnsetColorProp(id, color)) {
                    anyset = true;
                }
            }
            return anyset;
        }
        setAngles(center, clock, useCorrect) {
            this.angleInfo = Flexagonator.FlexagonAngles.makeAngles(center, clock, useCorrect !== undefined ? useCorrect : true);
        }
        setIsosceles(useCorrect) {
            this.angleInfo = Flexagonator.FlexagonAngles.makeIsosceles(this.flexagon, useCorrect !== undefined ? useCorrect : true);
        }
        getAngleInfo() {
            return this.angleInfo;
        }
        setDirections(directions) {
            this.flexagon = this.flexagon.changeDirections(directions);
            // history is invalid, reset using new flexagon
            this.clearHistory();
        }
        getDirections() {
            return this.flexagon.directions;
        }
        getFlexHistory() {
            const flexes = this.history.getCurrent().flexes;
            return flexes.map(flex => flex.fullName);
        }
        /** get flexagon from before any flexes were applied */
        getBaseFlexagon() {
            return this.history.getStart().flexagon;
        }
        /** get the total number of states this flexagon has been flexed through */
        getTotalStates() {
            return this.tracker.getTotalStates();
        }
        /** out of the all the states this flexagon has been in, get which state we're in currently (0-based) */
        getCurrentState() {
            return this.tracker.getCurrentState();
        }
        undoAll() {
            this.history.undoAll();
            this.flexagon = this.history.getCurrent().flexagon;
            this.tracker = this.history.getCurrent().tracker.getCopy();
        }
        undo() {
            this.history.undo();
            this.flexagon = this.history.getCurrent().flexagon;
            this.tracker = this.history.getCurrent().tracker.getCopy();
        }
        redo() {
            this.history.redo();
            this.flexagon = this.history.getCurrent().flexagon;
            this.tracker = this.history.getCurrent().tracker.getCopy();
        }
        clearHistory() {
            this.tracker = Flexagonator.Tracker.make(this.flexagon);
            this.history.clear(this.flexagon, this.tracker.getCopy());
        }
    }
    Flexagonator.FlexagonManager = FlexagonManager;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** get [[top labels], [bottom labels]] */
    function getLabels(flexagon, leafProps) {
        const [topIds, bottomIds] = flexagon.getVisible();
        const topLabels = topIds.map(id => leafProps.getFaceLabel(id));
        const bottomLabels = bottomIds.map(id => leafProps.getFaceLabel(id));
        return [topLabels, bottomLabels];
    }
    Flexagonator.getLabels = getLabels;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /*
      Store all the flexes that have been performed & the corresponding
      flexagon state.  Manage undoing & redoing flexes.
    */
    class History {
        constructor(original, tracker) {
            this.done = [];
            this.undone = [];
            this.done.push({ flexes: [], flexagon: original, tracker: tracker });
        }
        getCurrent() {
            return this.done[this.done.length - 1];
        }
        getStart() {
            return this.done[0];
        }
        add(newFlexes, newflexagon, tracker) {
            const allflexes = Flexagonator.addAndConsolidate(this.getCurrent().flexes, newFlexes, newflexagon.getPatCount());
            this.done.push({ flexes: allflexes, flexagon: newflexagon, tracker: tracker });
            this.undone = [];
        }
        canUndo() {
            return this.done.length > 1;
        }
        canRedo() {
            return this.undone.length > 0;
        }
        undoAll() {
            for (let i = this.done.length - 1; i > 0; i--) {
                this.undone.push(this.done[i]);
            }
            this.done = [this.done[0]];
        }
        undo() {
            if (this.done.length > 1) {
                this.undone.push(this.done.pop());
            }
        }
        redo() {
            if (this.undone.length > 0) {
                this.done.push(this.undone.pop());
            }
        }
        clear(original, tracker) {
            this.done = [];
            this.undone = [];
            this.done.push({ flexes: [], flexagon: original, tracker: tracker });
        }
    }
    Flexagonator.History = History;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // label & color new leaves by interpolating between the values on the old leaves
    function interpolateLeaves(pat, props, doLabels) {
        // e.g. when from 'a' to [a,b], where each letter is an id and has top & bottom properties
        // {top,bottom} -> [{top,(top+bottom)/2}, {(top+bottom)/2,bottom}]
        // {a,b} -> [{a,(a+b)/2}, {(a+b)/2,b}]
        const oldId = pat.getTop();
        if (doLabels) {
            const topLabel = getLabelAsNumber(props, oldId);
            const bottomLabel = getLabelAsNumber(props, -oldId);
            if (topLabel !== undefined && bottomLabel !== undefined) {
                recurse(topLabel, bottomLabel, pat.getAsLeafTree(), (id, v) => props.setLabelProp(id, v.toString()));
            }
        }
        const topColor = props.getColorProp(oldId);
        const bottomColor = props.getColorProp(-oldId);
        if (topColor !== undefined && bottomColor !== undefined) {
            recurse(topColor, bottomColor, pat.getAsLeafTree(), (id, v) => props.setColorProp(id, v));
        }
    }
    Flexagonator.interpolateLeaves = interpolateLeaves;
    function recurse(a, b, tree, set) {
        if (typeof tree === 'number') {
            const id = tree;
            set(id, a);
            set(-id, b);
            return;
        }
        const mid = (a + b) / 2;
        recurse(a, mid, tree[0], set);
        recurse(mid, b, tree[1], set);
    }
    function getLabelAsNumber(props, id) {
        const label = props.getFaceLabel(id);
        return label === undefined ? undefined : Number.parseFloat(label);
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Label the sides of the leaves in each pat by doing a breadth first traversal
     * of the binary tree of leaves.
     * - The front and back are labeled 1 & 2, using color[0] & color[1] if present.
     * - If there's an even number of pats, the odd pats and even pats are assigned
     *   different sets of numbers & colors.
     *   Leaf faces that are folded together are assigned the same number.
     * - If there's an odd number of pats, every pat uses the same numbering scheme.
     *   Leaf faces that are folded together are assigned consecutive numbers.
     * @param flexagon the flexagon to label
     * @param colors optional array of colors to apply corresponding where in the traversal we are
     */
    function labelAsTree(flexagon, colors) {
        const leafToLabel = []; // leaf number -> label number
        labelOutside(leafToLabel, flexagon);
        labelInsides(leafToLabel, flexagon);
        // note: we get rid of any gaps in the label numbers we created, which is generally nicer,
        // but we could decide to skip this step if we want consistency across different flexagons.
        const squished = squishNumbers(leafToLabel);
        return createLeafProps(squished, colors);
    }
    Flexagonator.labelAsTree = labelAsTree;
    function labelOutside(leafToLabel, flexagon) {
        const top = flexagon.getTopIds();
        top.forEach(id => leafToLabel[id] = 1);
        const bottom = flexagon.getBottomIds();
        bottom.forEach(id => leafToLabel[id] = 2);
    }
    function labelInsides(leafToLabel, flexagon) {
        const pats = flexagon.pats;
        if (pats.length % 2 === 0) {
            pats.forEach((pat, i) => handlePatFromEven(leafToLabel, pat, i));
        }
        else {
            pats.forEach((pat, i) => handlePatFromOdd(leafToLabel, pat));
        }
    }
    function handlePatFromEven(leafToLabel, pat, whichPat) {
        const unfold = pat.unfold();
        if (unfold === null) {
            return;
        }
        const n = (whichPat % 2 === 0) ? 1 : 2;
        let start = 2;
        leafToLabel[unfold[0].getTop()] = start + n;
        leafToLabel[unfold[1].getTop()] = start + n;
        let level = unfold;
        while (true) {
            start *= 2;
            const next = level.map(p => p === null ? null : p.unfold());
            next.forEach((pair, i) => {
                if (pair !== null) {
                    leafToLabel[pair[0].getTop()] = start + n + i * 2;
                    leafToLabel[pair[1].getTop()] = start + n + i * 2;
                }
            });
            if (!next.some(e => e !== null)) {
                return;
            }
            level = flatten(next);
        }
    }
    function handlePatFromOdd(leafToLabel, pat) {
        const unfold = pat.unfold();
        if (unfold === null) {
            return;
        }
        let start = 2;
        leafToLabel[unfold[0].getTop()] = start + 1;
        leafToLabel[unfold[1].getTop()] = start + 2;
        let level = unfold;
        while (true) {
            start *= 2;
            const next = level.map(p => p === null ? null : p.unfold());
            next.forEach((pair, i) => {
                if (pair !== null) {
                    leafToLabel[pair[0].getTop()] = start + 1 + i * 2;
                    leafToLabel[pair[1].getTop()] = start + 2 + i * 2;
                }
            });
            if (!next.some(e => e !== null)) {
                return;
            }
            level = flatten(next);
        }
    }
    // assign labels & colors to all leaf faces
    function createLeafProps(leafToLabel, colors) {
        const props = new Flexagonator.PropertiesForLeaves();
        Object.keys(leafToLabel).forEach(a => {
            const id = Number.parseInt(a);
            const n = leafToLabel[id];
            // set the leaf side identified by 'id' to label 'n' & colors[n-1]
            props.setLabelProp(id, n.toString());
            if (colors && colors[n - 1]) {
                props.setColorProp(id, colors[n - 1]);
            }
        });
        return props;
    }
    function flatten(array) {
        const results = [];
        array.forEach(e => {
            if (e === null) {
                results.push(null);
                results.push(null);
            }
            else {
                results.push(e[0]);
                results.push(e[1]);
            }
        });
        return results;
    }
    // get rid of gaps in the labels
    function squishNumbers(leafToLabel) {
        const hasLabel = collectAllLabels(leafToLabel);
        if (!hasGap(hasLabel)) {
            return leafToLabel;
        }
        const oldToNew = mapOldLabelsToNewLabels(hasLabel);
        return mapLeafNumbersToSquishedNumbers(leafToLabel, oldToNew);
        ;
    }
    function collectAllLabels(leafToLabel) {
        const hasLabel = [];
        Object.keys(leafToLabel).forEach(k => {
            const id = Number.parseInt(k);
            hasLabel[leafToLabel[id]] = true;
        });
        return hasLabel;
    }
    function hasGap(hasLabel) {
        // note that [0] is always empty, so we ignore it
        for (let i = 1; i < hasLabel.length; i++) {
            if (!hasLabel[i]) {
                return true;
            }
        }
        return false;
    }
    function mapOldLabelsToNewLabels(hasLabel) {
        const oldToNew = [];
        let current = 1;
        for (let i = 1; i < hasLabel.length; i++) {
            if (hasLabel[i]) {
                oldToNew[i] = current++;
            }
        }
        return oldToNew;
    }
    function mapLeafNumbersToSquishedNumbers(leafToLabel, oldToNew) {
        const newLeafToLabel = [];
        Object.keys(leafToLabel).forEach(k => {
            const id = Number.parseInt(k);
            newLeafToLabel[id] = oldToNew[leafToLabel[id]];
        });
        return newLeafToLabel;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * convert an array of labels (e.g., [[1,2],[3,4],[5,6]]) to LeafProperties,
     * optionally adding in colors (e.g., [0xff0000,0x0000ff]) indexed to numeric labels
     */
    function convertLeafProps(labels, repeat, colors) {
        let numbers = labels;
        if (repeat) {
            // if we have an odd number of pats, every other repeat swaps top & bottom
            const alt = labels.length % 2 === 0 ? labels : labels.map(p => [p[1], p[0]]);
            for (let i = 1; i < repeat; i++) {
                numbers = numbers.concat(i % 2 === 0 ? labels : alt);
            }
        }
        const leafProps = numbers.map(pair => {
            if (colors && typeof pair[0] === 'number' && typeof pair[1] === 'number') {
                const front = pair[0];
                const back = pair[1];
                return { front: { label: front.toString(), color: colors[front - 1] }, back: { label: back.toString(), color: colors[back - 1] } };
            }
            else {
                return { front: { label: pair[0].toString() }, back: { label: pair[1].toString() } };
            }
        });
        return leafProps;
    }
    Flexagonator.convertLeafProps = convertLeafProps;
    class PropertiesForLeaves {
        constructor(props) {
            this.props = props === undefined ? [] : props;
        }
        reset() {
            this.props = [];
        }
        getRawProps() {
            return this.props;
        }
        setLabelProp(id, label) {
            const props = this.getFacePropsToSet(id);
            props.label = label;
        }
        setUnsetLabelProp(id, label) {
            const props = this.getFacePropsToSet(id);
            if (props.label === undefined) {
                props.label = label;
                return true;
            }
            return false;
        }
        setColorProp(id, color) {
            const props = this.getFacePropsToSet(id);
            props.color = color;
        }
        setUnsetColorProp(id, color) {
            const props = this.getFacePropsToSet(id);
            if (props.color === undefined) {
                props.color = color;
                return true;
            }
            return false;
        }
        getFaceLabel(id) {
            const props = this.getFacePropsToGet(id);
            if (props !== undefined && props.label !== undefined) {
                return props.label;
            }
            return undefined;
        }
        getColorProp(id) {
            const props = this.getFacePropsToGet(id);
            if (props === undefined) {
                return props;
            }
            return props.color;
        }
        getColorAsRGBString(id) {
            const color = this.getColorProp(id);
            if (color === undefined) {
                return color;
            }
            return "rgb("
                + ((color & 0xff0000) >> 16).toString() + ","
                + ((color & 0xff00) >> 8).toString() + ","
                + (color & 0xff).toString() + ")";
        }
        // move properties to a different id based on how a leaf was split
        adjustForSplit(topId, bottomId) {
            const idToRemove = -topId;
            const oldprops = this.getFacePropsToGet(idToRemove);
            if (oldprops === undefined) {
                return;
            }
            const idToAdd = bottomId;
            const newprops = this.getFacePropsToSet(idToAdd);
            newprops.color = oldprops.color;
            newprops.label = oldprops.label;
            oldprops.color = undefined;
            oldprops.label = undefined;
        }
        getFacePropsToGet(id) {
            const leafProps = this.props[Math.abs(id) - 1];
            if (leafProps === undefined || leafProps === null) {
                return undefined;
            }
            return id > 0 ? leafProps.front : leafProps.back;
        }
        getFacePropsToSet(id) {
            const front = id > 0;
            id = Math.abs(id) - 1;
            if (this.props[id] === undefined) {
                this.props[id] = { front: {}, back: {} };
            }
            return front ? this.props[id].front : this.props[id].back;
        }
    }
    Flexagonator.PropertiesForLeaves = PropertiesForLeaves;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function isValid(tree) {
        if (typeof (tree) === "number") {
            return Number.isInteger(tree);
        }
        if (Array.isArray(tree)) {
            const array = tree;
            if (array.length == 2) {
                return isValid(array[0]) && isValid(array[1]);
            }
        }
        return false;
    }
    Flexagonator.isValid = isValid;
    function areEqual(tree1, tree2) {
        if (typeof (tree1) !== typeof (tree2))
            return false;
        if (typeof (tree1) === "number") {
            return tree1 === tree2;
        }
        if (Array.isArray(tree1)) {
            const array1 = tree1;
            const array2 = tree2;
            if (array1.length == 2 && array2.length == 2) {
                return areEqual(array1[0], array2[0]) && areEqual(array1[1], array2[1]);
            }
        }
        return false;
    }
    Flexagonator.areEqual = areEqual;
    /** compare arrays of leaftrees, i.e. flexagons */
    function areLTArraysEqual(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((value, i) => areEqual(value, b[i]));
    }
    Flexagonator.areLTArraysEqual = areLTArraysEqual;
    function getTop(tree) {
        return (typeof (tree) === "number") ? tree : getTop(tree[0]);
    }
    Flexagonator.getTop = getTop;
    function parseLeafTrees(str) {
        try {
            const result = JSON.parse(str);
            if (!Array.isArray(result)) {
                return { reason: Flexagonator.TreeCode.ExpectedArray, context: result };
            }
            const array = result;
            let i = 0;
            for (let tree of array) {
                if (!isValid(tree)) {
                    return { reason: Flexagonator.TreeCode.ErrorInSubArray, context: "problem in element # " + i };
                }
                i++;
            }
            return result;
        }
        catch (error) {
            return { reason: Flexagonator.TreeCode.ParseError, context: error };
        }
    }
    Flexagonator.parseLeafTrees = parseLeafTrees;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Create a new flex definition from a flex sequence.
     * Note: doesn't currently handle a + in the sequence.
     * @param sequence sequence that the new flex will be equal to, e.g. "S >> T'"
     * @param flexes flex definitions to reference when creating the new flex
     */
    function makeFlexFromSequence(sequence, flexes, name, rotation, inputDirs, outputDirs, orderOfDirs) {
        const flexNames = Flexagonator.parseFlexSequence(sequence);
        const flexagon = makeEmptyFlexagon(flexes);
        const fm = new Flexagonator.FlexagonManager(flexagon, undefined, flexes);
        const generator = makeGeneratingSequence(flexNames);
        const result = fm.applyFlexes(generator, false);
        if (Flexagonator.isFlexError(result)) {
            return result;
        }
        const output = fm.flexagon.getAsLeafTrees();
        const undo = flexNames.map(flexName => flexName.getInverse()).reverse();
        const result2 = fm.applyFlexes(undo, false);
        if (Flexagonator.isFlexError(result2)) {
            return result2;
        }
        const input = fm.flexagon.getAsLeafTrees();
        name = name ? name : "new flex";
        const fr = rotation ? rotation : Flexagonator.FlexRotation.None;
        return Flexagonator.makeFlex(name, input, output, fr, inputDirs, outputDirs, orderOfDirs);
    }
    Flexagonator.makeFlexFromSequence = makeFlexFromSequence;
    function makeEmptyFlexagon(flexes) {
        const allNames = Object.getOwnPropertyNames(flexes);
        const someFlex = flexes[allNames[0]];
        const numPats = someFlex.input.length;
        const pats = [];
        for (var i = 1; i <= numPats; i++) {
            pats.push(i);
        }
        return Flexagonator.Flexagon.makeFromTree(pats);
    }
    function makeGeneratingSequence(flexNames) {
        return flexNames.map(flexName => {
            if (flexName.baseName === '>' || flexName.baseName === '<'
                || flexName.baseName === '^' || flexName.shouldGenerate) {
                return flexName;
            }
            return Flexagonator.makeFlexName(flexName.flexName + '*');
        });
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function combineFlexes(f1, f2) {
        let flexes = {};
        const keys1 = Object.getOwnPropertyNames(f1);
        for (let key of keys1) {
            flexes[key] = f1[key];
        }
        const keys2 = Object.getOwnPropertyNames(f2);
        for (let key of keys2) {
            flexes[key] = f2[key];
        }
        return flexes;
    }
    Flexagonator.combineFlexes = combineFlexes;
    /** make all the built-in flexes for flexagon with the given number of pats */
    function makeAllFlexes(patCount, includeDirs) {
        let flexes = {};
        const dirs = includeDirs ? getIsoDirs(patCount) : undefined;
        if (patCount === 6) {
            flexes = makeHexaFlexes();
        }
        else {
            addRotates(patCount, flexes);
            addLocalFlexes(patCount, flexes);
            if (patCount % 2 == 0)
                flexes["P"] = createPinch(patCount, dirs);
            if (patCount >= 6 && patCount % 2 === 0)
                flexes["V"] = createV(patCount, dirs);
            if (patCount == 8 || patCount == 10 || patCount == 12)
                flexes["Tw"] = createTwist(patCount, dirs);
            if (patCount >= 5)
                flexes["Ltf"] = createLtf(patCount, dirs);
            if (patCount >= 5)
                flexes["Lk"] = createSlotPocket(patCount, dirs);
            if (patCount == 5)
                flexes["L3"] = createSlotTriplePocket(dirs);
            for (let i = 0; i < patCount - 5; i++) {
                const s = "T" + (i + 1).toString();
                flexes[s] = createTuck(patCount, i, dirs);
            }
            addSinglePinches(patCount, flexes);
            addDoublePinches(patCount, flexes);
        }
        // add all the inverses
        for (const flex of Object.keys(flexes)) {
            flexes[flex + "'"] = flexes[flex].createInverse();
        }
        return flexes;
    }
    Flexagonator.makeAllFlexes = makeAllFlexes;
    /** make all the built-in flexes for a hexaflexagon */
    function makeHexaFlexes() {
        const flexes = {};
        addRotates(6, flexes);
        addLocalFlexes(6, flexes);
        flexes["P"] = Flexagonator.makeFlex("pinch flex", [[-2, 1], -3, [5, -4], 6, [-8, 7], -9], [2, [-4, 3], -5, [7, -6], 8, [1, 9]], Flexagonator.FlexRotation.BAC);
        flexes["T"] = Flexagonator.makeFlex("tuck flex", [[[-2, 3], 1], 4, 5, [-7, 6], -8, -9], [3, 4, 5, [-7, 6], -8, [2, [-9, -1]]], Flexagonator.FlexRotation.None);
        flexes["Ttf"] = Flexagonator.makeFlex("tuck top front", [[[-2, 3], 1], [-5, 4], -6, [8, -7], 9, 10], [[4, -3], 5, [-7, 6], -8, [[10, -1], -9], -2], Flexagonator.FlexRotation.CBA);
        flexes["V"] = Flexagonator.makeFlex("v flex", [1, [-3, 2], [5, -4], 6, 7, [-9, 8]], [[2, -1], 3, 4, [-6, 5], [8, -7], 9], Flexagonator.FlexRotation.CBA);
        flexes["Ltf"] = Flexagonator.makeFlex("slot tuck top front", [[[[3, -2], -4], 1], -5, -6, -7, [9, -8], 10], [10, [-2, 1], -3, -4, -5, [9, [-6, [-8, 7]]]], Flexagonator.FlexRotation.ACB);
        flexes["Ltb"] = Flexagonator.makeFlex("slot tuck top back", [[[-2, [-4, 3]], 1], -5, -6, -7, [9, -8], 10], [-1, -2, -3, [5, -4], [[-7, 8], 6], [-10, 9]], Flexagonator.FlexRotation.CBA);
        flexes["Lbf"] = Flexagonator.makeFlex("slot tuck bottom front", [[[-2, 3], 1], [-5, 4], -6, -7, [9, -8], 10], [[-3, 2], -4, [6, -5], [-8, 7], -9, [1, -10]], Flexagonator.FlexRotation.BAC);
        flexes["Lbb"] = Flexagonator.makeFlex("slot tuck bottom back", [[[-2, 3], 1], [-5, 4], -6, -7, [[9, -10], -8], -11], [-2, [4, -3], 5, [[-7, 8], 6], 9, [[-11, -1], 10]], Flexagonator.FlexRotation.CAB);
        flexes["Lh"] = Flexagonator.makeFlex("slot half", [[[-2, [-4, 3]], 1], -5, -6, -7, [[9, -10], -8], -11], [[[-11, -1], 10], -2, -3, [5, -4], [[-7, 8], 6], 9], Flexagonator.FlexRotation.CBA);
        flexes["Lk"] = Flexagonator.makeFlex("slot pocket", [[[[3, -2], -4], 1], -5, -6, -7, [[[-10, 9], 11], -8], 12], [10, [-2, [11, [1, -12]]], -3, -4, -5, [9, [-6, [-8, 7]]]], Flexagonator.FlexRotation.ACB);
        flexes["Tk"] = Flexagonator.makeFlex("ticket flex", [1, 2, 3, [-5, 4], [[[-8, 7], 9], -6], [-11, 10]], [-8, [6, -7], [-4, 5], -3, -2, [[10, -9], [-1, -11]]], Flexagonator.FlexRotation.None);
        return flexes;
    }
    /** return just the flexes that can't be done using other flexes */
    function getPrimeFlexes(all, patCount) {
        const flexes = {};
        for (const prime of primes) {
            if (all[prime] !== undefined) {
                flexes[prime] = all[prime];
            }
        }
        // S3 is special in that it's not prime for n=6|7, but is for n>=8
        if (patCount && patCount >= 8 && all['S3'] !== undefined) {
            flexes['S3'] = all['S3'];
        }
        return flexes;
    }
    Flexagonator.getPrimeFlexes = getPrimeFlexes;
    function filterToPrime(flexes, patCount) {
        const filtered = flexes.filter(f => primes.indexOf(f) !== -1);
        if (patCount >= 8 && flexes.indexOf('S3') !== -1) {
            filtered.push('S3');
        }
        return filtered;
    }
    Flexagonator.filterToPrime = filterToPrime;
    /** filter 'flexes' to eliminate redundancies (e.g., P not P', but both T & T') */
    function filterToInteresting(flexes) {
        const filtered = flexes.filter(f => primes.indexOf(f) !== -1 || unique.indexOf(f) !== -1);
        return filtered;
    }
    Flexagonator.filterToInteresting = filterToInteresting;
    const primes = [
        "P", "S", "V", "F", "Tw", "Ltf", "Ltb", "Ltb'",
        "T", "T'", "Tf", "T1", "T1'", "T2", "T2'", // limit the tuck variants
        "Bf", "Tr2", "Tr3", "Tr4", // local: directions other than ////
        "Ds", "Tu", "Tao", "Hat", "Fet", // global: directions other than ////
    ];
    const unique = [
        "S3", "St", "Fm", "F3", "F4",
        "Lbf", "Lbb", "Lh", "Lk", "L3",
        "P44d", "P333d", "P334d", "P55d", "P3333d", "P444d", "P66d", "P3434d",
    ];
    /** add ><^~ */
    function addRotates(patCount, flexes) {
        const input = [], rightOut = [], leftOut = [], overOut = [], changeOut = [];
        const rightDirs = [], leftDirs = [], overDirs = [], changeDirs = [];
        for (let i = 0; i < patCount; i++) {
            input[i] = i + 1;
            rightOut[i] = i + 2 > patCount ? 1 : i + 2;
            leftOut[i] = i < 1 ? patCount : i;
            overOut[i] = i - patCount;
            changeOut[i] = -i - 1;
            // directions start at 1
            rightDirs[i] = i == patCount - 1 ? 1 : i + 2;
            leftDirs[i] = i == 0 ? patCount : i;
            overDirs[i] = patCount - i;
            changeDirs[i] = -(i + 1); // means that direction should be reversed
        }
        flexes[">"] = Flexagonator.makeFlex("shift right", input, rightOut, Flexagonator.FlexRotation.Right, undefined, undefined, rightDirs);
        flexes["<"] = Flexagonator.makeFlex("shift left", input, leftOut, Flexagonator.FlexRotation.Left, undefined, undefined, leftDirs);
        flexes["^"] = Flexagonator.makeFlex("turn over", input, overOut, Flexagonator.FlexRotation.None, undefined, undefined, overDirs);
        flexes["~"] = Flexagonator.makeFlex("change directions", input, changeOut, Flexagonator.FlexRotation.CBA, undefined, undefined, changeDirs);
    }
    /** add flexes that only impact a subset of pats */
    function addLocalFlexes(patCount, flexes) {
        flexes["Tf"] = Flexagonator.createLocalFlex("forced tuck", patCount - 2, 5, [1], /**/ [[[-3, 4], 2]], [[3, [1, -2]]], /**/ [4], "/", "/", "/", "/"); // /#/
        if (patCount === 4 || patCount >= 6) {
            flexes["St"] = Flexagonator.createLocalFlex("silver tetra", patCount - 4, 9, [[3, [1, -2]], 4], /**/ [[7, [5, -6]], 8], [1, [[-3, 4], 2]], /**/ [5, [[-7, 8], 6]], "//", "//", "//", "//"); // //#//
        }
        if (patCount >= 5) {
            flexes["S"] = Flexagonator.createLocalFlex("pyramid shuffle", patCount - 3, 8, [[[[3, -2], -4], 1], -5], /**/ [[7, -6]], [[-2, 1], -3], /**/ [[7, [-4, [-6, 5]]]], "//", "/", "//", "/"); // //#/
        }
        if (patCount >= 6) {
            flexes["F"] = Flexagonator.createLocalFlex("flip", patCount - 4, 9, [[[3, -4], [1, -2]], -5], /**/ [[7, -6], 8], [1, [-3, 2]], /**/ [-4, [[-7, 8], [-5, 6]]], "//", "//", "//", "//"); // //#//
            flexes["Fm"] = Flexagonator.createLocalFlex("mobius flip", patCount - 4, 9, [[[3, -4], [1, -2]], -5, -6], /**/ [[8, -7]], [1, [-3, 2], -4], /**/ [[8, [-5, [-7, 6]]]], "///", "/", "///", "/"); // ///#/
            flexes["S3"] = Flexagonator.createLocalFlex("pyramid shuffle 3", patCount - 4, 9, [[[[3, -2], -4], 1], -5, -6], /**/ [[8, -7]], [[-2, 1], -3, -4], /**/ [[8, [-5, [-7, 6]]]], "///", "/", "///", "/"); // ///#/
        }
        if (patCount >= 10) {
            flexes["F3"] = Flexagonator.createLocalFlex("flip 3", patCount - 5, 10, [[[3, -4], [1, -2]], -5, -6], /**/ [[8, -7], 9], [1, [-3, 2]], /**/ [-4, -5, [[-8, 9], [-6, 7]]], "///", "//", "///", "//", Flexagonator.FlexRotation.Left, -1); // ///#// => //#///
        }
        if (patCount >= 12) {
            flexes["F4"] = Flexagonator.createLocalFlex("flip 4", patCount - 6, 11, [[[3, -4], [1, -2]], -5, -6, -7], /**/ [[9, -8], 10], [1, [-3, 2]], /**/ [-4, -5, -6, [[-9, 10], [-7, 8]]], "////", "//", "////", "//", Flexagonator.FlexRotation.None, -2); // ////#// => //#////
        }
    }
    function createPinch(patCount, dirs) {
        // (1,2) (3) ... (i,i+1) (i+2) ... (n-2,n-1) (n)
        // (^1) (5,^3) ... (^i) (i+4,^i+2) ... (^n-2) (2,^n)
        const input = [];
        const output = [];
        const leaves = patCount * 3 / 2;
        for (let i = 0; i < patCount; i += 2) {
            const a = (i / 2) * 3 + 1;
            // e.g. (1,2) (3)
            input.push([a, a + 1]);
            input.push(a + 2);
            // e.g. (^1) (5,^3)
            output.push(-a);
            let b = (a + 2) % leaves;
            b = (b == 0 ? leaves : b);
            output.push([(a + 4) % leaves, -b]);
        }
        return Flexagonator.makeFlex("pinch flex", input, output, Flexagonator.FlexRotation.BAC, dirs, dirs);
    }
    /** adds some single pinch flexes for the given number of pats */
    function addSinglePinches(patCount, flexes) {
        if (patCount === 8) {
            flexes["P44"] = createSinglePinch(patCount, [4]);
        }
        if (patCount === 9) {
            flexes["P333"] = createSinglePinch(patCount, [3, 6]);
        }
        if (patCount === 10) {
            flexes["P334"] = createSinglePinch(patCount, [3, 6]);
            flexes["P55"] = createSinglePinch(patCount, [5]);
        }
        if (patCount === 12) {
            flexes["P3333"] = createSinglePinch(patCount, [3, 6, 9]);
            flexes["P444"] = createSinglePinch(patCount, [4, 8]);
            flexes["P66"] = createSinglePinch(patCount, [6]);
        }
        if (patCount === 14) {
            flexes["P3434"] = createSinglePinch(patCount, [3, 7, 10]);
        }
    }
    /** creates a single pinch where 'which' lists the hinges you pinch at */
    function createSinglePinch(patCount, which) {
        // 'which' lists the vertices where the basic unit will be applied after 0, e.g. [3,6] for P333
        // e.g. [ [-2,1], -3, -4, [6,-5], 7, 8, [-10,9], -11, -12 ]
        //      [ 2, 3, [-5,4], -6, -7, [9,-8], 10, 11, [1,12] ]
        // dirs /? //? //? /
        //      /?'//?'//?'/
        /*
        # [-2,1] / -3 ? -4 / [6,-5] / 7 ? 8 / [-10,9] / -11 ? -12 /
        # 2 / 3 ?' [-5,4] / -6 / -7 ?' [9,-8] / 10 / 11 ?' [1,12] /
    
        # [-2,1] / -3 ? -4 ? -5 / [7,-6] / 8 ? 9 ? 10 / [-12,11] / -13 ? -14 ? -15 /
        # 2 / 3 ?' 4 ?' [-6,5] / -7 / -8 ?' -9 ?' [11,-10] / 12 / 13 ?' 14 ?' [1,15] /
        */
        const input = [];
        const output = [];
        // input
        let iWhich = -1;
        let iLeaf = 1;
        for (let iPat = 0; iPat < patCount; iPat++) {
            const even = iWhich % 2 === 0;
            if ((iWhich == -1) || (iWhich < which.length && which[iWhich] === iPat)) {
                input.push(even ? [iLeaf + 1, -iLeaf] : [-(iLeaf + 1), iLeaf]);
                iWhich++;
                iLeaf += 2;
            }
            else {
                input.push(even ? -iLeaf : iLeaf);
                iLeaf++;
            }
        }
        // output
        iWhich = 0;
        iLeaf = 2;
        for (let iPat = 0; iPat < patCount; iPat++) {
            const even = iWhich % 2 === 0;
            if (iWhich < which.length && which[iWhich] - 1 === iPat) {
                output.push(even ? [-(iLeaf + 1), iLeaf] : [iLeaf + 1, -iLeaf]);
                iWhich++;
                iLeaf += 2;
            }
            else if (iPat === patCount - 1) {
                output.push([1, iLeaf]);
            }
            else {
                output.push(even ? iLeaf : -iLeaf);
                iLeaf++;
            }
        }
        // directions, e.g., (12,[4,4]) -> in: /??//??//??/, out: /?'?'//?'?'//?'?'/
        let directions = "";
        for (iWhich = 0; iWhich < which.length + 1; iWhich++) {
            const mid = iWhich === 0 ? which[0] :
                iWhich === which.length ? patCount - which[which.length - 1] :
                    which[iWhich] - which[iWhich - 1];
            directions += "/" + "?".repeat(mid - 2) + "/";
        }
        // all the ?'s need to flip
        const orderOfDirs = [];
        for (let i = 0; i < directions.length; i++) {
            orderOfDirs.push(directions[i] === '?' ? -(i + 1) : i + 1);
        }
        // e.g. patCount=9 & which=[3,6] turns into "333"
        let nums = which[0].toString();
        for (let i = 1; i < which.length; i++) {
            nums += (which[i] - which[i - 1]).toString();
        }
        nums += (patCount - which[which.length - 1]).toString();
        return Flexagonator.makeFlex("pinch " + nums, input, output, Flexagonator.FlexRotation.BAC, directions, directions, orderOfDirs);
    }
    /** adds some double pinch flexes for the given number of pats */
    function addDoublePinches(patCount, flexes) {
        if (patCount === 8) {
            flexes["P44d"] = createDoublePinch(patCount, [4]);
        }
        if (patCount === 9) {
            flexes["P333d"] = createDoublePinch(patCount, [3, 6]);
        }
        if (patCount === 10) {
            flexes["P334d"] = createDoublePinch(patCount, [3, 6]);
            flexes["P55d"] = createDoublePinch(patCount, [5]);
        }
        if (patCount === 12) {
            flexes["P3333d"] = createDoublePinch(patCount, [3, 6, 9]);
            flexes["P444d"] = createDoublePinch(patCount, [4, 8]);
            flexes["P66d"] = createDoublePinch(patCount, [6]);
        }
        if (patCount === 14) {
            flexes["P3434d"] = createDoublePinch(patCount, [3, 7, 10]);
        }
    }
    /** creates a double pinch where 'which' lists the hinges you pinch at */
    function createDoublePinch(patCount, which) {
        // basic 2-pat unit: [1, [[2, 3], 4]]  ->  [[2, [1, -4]], 3]
        // 'which' lists the vertices where the basic unit will be applied after 0, e.g. [3,6] for P333d
        // e.g. [[1,3], 2], 4, 5, [[6,8], 7], 9, 10, [[11,13], 12], 14, 15
        //      3, 4, [-6, [5,-7]], 8, 9, [-11, [10,-12]], 13, 14, [-1, [15,-2]]
        const input = [];
        const output = [];
        // input
        let iWhich = -1;
        let iLeaf = 1;
        for (let iPat = 0; iPat < patCount; iPat++) {
            if ((iWhich == -1) || (iWhich < which.length && which[iWhich] === iPat)) {
                input.push([[iLeaf, iLeaf + 2], iLeaf + 1]);
                iWhich++;
                iLeaf += 3;
            }
            else {
                input.push(iLeaf++);
            }
        }
        // output
        iWhich = 0;
        iLeaf = 3;
        for (let iPat = 0; iPat < patCount; iPat++) {
            if (iWhich < which.length && which[iWhich] - 1 === iPat) {
                output.push([-(iLeaf + 1), [iLeaf, -(iLeaf + 2)]]);
                iWhich++;
                iLeaf += 3;
            }
            else if (iPat === patCount - 1) {
                output.push([-1, [iLeaf, -2]]);
            }
            else {
                output.push(iLeaf);
                iLeaf++;
            }
        }
        // directions, e.g., (12,[4,4]) -> /??//??//??/
        let directions = "";
        for (iWhich = 0; iWhich < which.length + 1; iWhich++) {
            const mid = iWhich === 0 ? which[0] :
                iWhich === which.length ? patCount - which[which.length - 1] :
                    which[iWhich] - which[iWhich - 1];
            directions += "/" + "?".repeat(mid - 2) + "/";
        }
        // e.g. patCount=9 & which=[3,6] turns into "333d"
        let nums = which[0].toString();
        for (let i = 1; i < which.length; i++) {
            nums += (which[i] - which[i - 1]).toString();
        }
        nums += (patCount - which[which.length - 1]).toString();
        return Flexagonator.makeFlex("pinch " + nums + "d", input, output, Flexagonator.FlexRotation.None, directions, directions);
    }
    function createV(patCount, dirs) {
        // (1) (^3,2) ... (i) (^i+2,i+1) ... (n-4,^n-5) (n-3)  (n-2) (^n,n-1)
        // (2,^1) (3) ... (i+1,^i) (i+2) ... (n-5) (^n-3,n-4)  (n-1,^n-2) (n)
        const input = [];
        let output = [];
        const leaves = patCount * 3 / 2;
        // like pinch flex
        for (let i = 1; i < leaves - 6; i += 3) {
            input.push(i);
            input.push([-(i + 2), i + 1]);
            output.push([i + 1, -i]);
            output.push(i + 2);
        }
        // v-flex treats these pats differently
        input.push([leaves - 4, -(leaves - 5)]);
        input.push(leaves - 3);
        output.push(leaves - 5);
        output.push([-(leaves - 3), leaves - 4]);
        // like pinch flex
        input.push(leaves - 2);
        input.push([-leaves, leaves - 1]);
        output.push([leaves - 1, -(leaves - 2)]);
        output.push(leaves);
        // shift output so that V' = ^V^
        if (patCount > 6) {
            const shift = patCount - 6;
            const one = output.slice(shift);
            const two = output.slice(0, shift);
            output = one.concat(two);
        }
        return Flexagonator.makeFlex("v flex", input, output, Flexagonator.FlexRotation.CBA, dirs, dirs);
    }
    function createTwist(patCount, dirs) {
        var input = [];
        var output = [];
        if (patCount == 8) {
            input = [[2, -1], [-4, 3], -5, -6, [8, -7], [-10, 9], -11, -12];
            output = [-2, -3, [5, -4], [-7, 6], -8, -9, [11, -10], [-1, 12]];
        }
        else if (patCount == 10) {
            input = [[1, 2], [3, 4], 5, [6, 7], 8, [9, 10], 11, [12, 13], 14, 15];
            output = [-1, -4, [-5, 3], -7, [-8, 6], -10, [-11, 9], -13, [-14, 12], [2, -15]];
        }
        else if (patCount == 12) {
            input = [[1, 2], [3, 4], 5, [6, 7], 8, 9, [10, 11], [12, 13], 14, [15, 16], 17, 18];
            output = [-1, -4, [-5, 3], -7, [-8, 6], [11, -9], -10, -13, [-14, 12], -16, [-17, 15], [2, -18]];
        }
        return Flexagonator.makeFlex("twist flex", input, output, Flexagonator.FlexRotation.CBA, dirs, dirs);
    }
    function createLtf(patCount, dirs) {
        // (((1,2)3)4) ... (i) ... (n-4) (n-3) (n-2,n-1) (n)
        // (n) (2,4) (^1) (3) ... (i) ... (n-2(n-4(n-1,^n-3)))
        const input = [];
        const output = [];
        const leaves = patCount + 4;
        input.push([[[1, 2], 3], 4]);
        for (let i = 5; i < patCount + 2; i++) {
            input.push(i);
        }
        input.push([leaves - 2, leaves - 1]);
        input.push(leaves);
        // post
        output.push(leaves);
        output.push([2, 4]);
        output.push(-1);
        output.push(3);
        for (let i = 5; i < patCount; i++) {
            output.push(i);
        }
        output.push([leaves - 2, [leaves - 4, [leaves - 1, -(leaves - 3)]]]);
        return Flexagonator.makeFlex("slot tuck top front", input, output, Flexagonator.FlexRotation.ACB, dirs, dirs);
    }
    function createSlotPocket(patCount, dirs) {
        // (((1,2)3)4) ... (i) ... (n-5) (((n-4,n-3)n-2)n-1) (n)
        // (^n-4) (2(n-2(4,^n))) (^1) (3) ... (i) ... (n-3(n-6(n-1,^n-5)))
        const input = [];
        const output = [];
        const leaves = patCount + 6;
        input.push([[[1, 2], 3], 4]);
        for (let i = 5; i < patCount + 2; i++) {
            input.push(i);
        }
        input.push([[[leaves - 4, leaves - 3], leaves - 2], leaves - 1]);
        input.push(leaves);
        // post
        output.push(-(leaves - 4));
        output.push([2, [leaves - 2, [4, -leaves]]]);
        output.push(-1);
        output.push(3);
        for (let i = 5; i < patCount; i++) {
            output.push(i);
        }
        output.push([leaves - 3, [leaves - 6, [leaves - 1, -(leaves - 5)]]]);
        return Flexagonator.makeFlex("slot pocket", input, output, Flexagonator.FlexRotation.ACB, dirs, dirs);
    }
    function createSlotTriplePocket(dirs) {
        const input = [[[[12, -11], -13], 10], [[[2, -1], -3], -14], -4, [[[-7, 6], 8], -5], 9];
        const output = [-2, [6, [-3, [-5, 4]]], 7, [-11, [8, [10, -9]]], [-1, [-12, [-14, 13]]]];
        return Flexagonator.makeFlex("slot triple pocket", input, output, Flexagonator.FlexRotation.None, dirs, dirs);
    }
    // where: which opposite hinge is open starting from 0
    function createTuck(patCount, where, dirs) {
        // ((1,2)3) (4) ... (i,i+1) ... (n-1) (n)
        // (2) (4) ... (i,i+1) ... (n-1) (^1(n,^3))
        const input = [];
        const output = [];
        const leaves = patCount + 3;
        input.push([[1, 2], 3]);
        for (let i = 4; i <= leaves; i++) {
            if (i == where + 6) {
                input.push([i, i + 1]);
            }
            else if (i != where + 7) {
                input.push(i);
            }
        }
        output.push(2);
        for (let i = 4; i < leaves; i++) {
            if (i == where + 6) {
                output.push([i, i + 1]);
            }
            else if (i != where + 7) {
                output.push(i);
            }
        }
        output.push([-1, [leaves, -3]]);
        const name = "tuck" + (where == 0 ? "" : (where + 1).toString());
        return Flexagonator.makeFlex(name, input, output, Flexagonator.FlexRotation.None, dirs, dirs);
    }
    /** get the pat directions for an isoflexagon with all pats meeting in the center */
    function getIsoDirs(patCount) {
        let s = '';
        for (let i = 0; i < patCount; i++)
            s += '/';
        return s;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * return lists of valid name pieces.
     * optionally filtered to a selected overall shape, leaf shape, and/or pat count
     */
    function getNamePieces(filter) {
        // filter to just the flexagon names matching the selected pieces, if any
        const patCount = filter.patsPrefix ? Flexagonator.getPatsPrefixAsNumber(filter.patsPrefix) : null;
        const names1 = !filter.overallShape ? flexagonNames : flexagonNames.filter(f => f[0] === filter.overallShape);
        const names2 = !filter.leafShape ? names1 : names1.filter(f => f[1] === filter.leafShape);
        const names3 = !filter.patsPrefix ? names2 : names2.filter(f => f[2] === patCount);
        // make lists of the unique names for each piece
        const overallShapes = getUnique(names3.map(n => n[0]));
        const leafShapes = getUnique(names3.map(n => n[1]).filter(n => n !== ''));
        const patCounts = getUnique(names3.map(n => n[2])).sort((a, b) => a > b ? 1 : -1);
        return { overallShapes, leafShapes, patCounts };
    }
    Flexagonator.getNamePieces = getNamePieces;
    /** a collection of supported flexagons by name pieces (not exhaustive) */
    const flexagonNames = [
        ['triangular', 'bronze', 6],
        ['triangular', 'bronze', 18],
        ['triangular ring', 'right', 12],
        ['pyramid', 'regular', 4],
        ['square', 'silver', 4],
        ['square', 'silver', 8],
        ['square ring', 'right', 16],
        ['rhombic', 'bronze', 4],
        ['rhombic', 'bronze', 12],
        ['rhombic', 'bronze', 16],
        ['kite', 'bronze', 8],
        ['pentagonal', 'isosceles', 5],
        ['pentagonal', 'right', 10],
        ['pentagonal', 'silver', 10],
        ['pentagonal ring', 'right', 20],
        ['hexagonal', 'regular', 6],
        ['hexagonal', 'regular', 10],
        ['hexagonal', 'silver', 12],
        ['hexagonal', 'bronze', 12],
        ['hexagonal ring', 'isosceles', 9],
        ['hexagonal ring', 'regular', 12],
        ['hexagonal ring', 'isosceles', 12],
        ['hexagonal ring', 'regular', 14],
        ['hexagonal ring', 'silver', 14],
        ['hexagonal ring', 'regular', 18],
        ['hexagonal ring', 'regular', 24],
        ['hexagonal ring', 'bronze', 24],
        ['heptagonal', 'isosceles', 7],
        ['octagonal', 'isosceles', 8],
        ['octagonal ring', 'isosceles', 12],
        ['octagonal ring', 'isosceles', 14],
        ['octagonal ring', 'isosceles', 16],
        ['enneagonal', 'isosceles', 9],
        ['decagonal', 'isosceles', 10],
        ['decagonal ring', 'isosceles', 15],
        ['decagonal ring', 'isosceles', 20],
        ['dodecagonal', 'isosceles', 12],
        ['dodecagonal ring', 'isosceles', 24],
        ['star', '', 6],
        ['star', '', 8],
        ['star', 'isosceles', 10],
        ['star', 'isosceles', 12],
        ['star', 'isosceles', 14],
        ['star', 'isosceles', 16],
        ['bracelet', 'regular', 8],
        ['bracelet', 'regular', 10],
        ['bracelet', 'regular', 12],
        ['bracelet', 'regular', 16],
        ['bracelet', 'regular', 20],
        ['bracelet', 'regular', 24],
        ['bracelet', 'silver', 8],
        ['bracelet', 'silver', 12],
        ['bracelet', 'silver', 16],
        ['bracelet', 'silver', 20],
        ['bracelet', 'silver', 24],
    ];
    /** return a list of all the unique items from the list */
    function getUnique(list) {
        const newList = [];
        list.forEach(s => { if (newList.indexOf(s) === -1)
            newList.push(s); });
        return newList;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** create a full flexagon name from pieces */
    function namePiecesToName(pieces) {
        let name = '';
        if (pieces.overallShape) {
            name += pieces.overallShape + ' ';
        }
        if (pieces.leafShape) {
            name += pieces.leafShape + ' ';
        }
        if (pieces.faceCount) {
            name += pieces.faceCount + "-";
        }
        if (pieces.patsPrefix) {
            let prefix = pieces.patsPrefix.toString();
            if (typeof pieces.patsPrefix === 'number') {
                const greek = numberToGreekPrefix(pieces.patsPrefix);
                if (greek) {
                    prefix = greek;
                }
            }
            name += prefix;
        }
        name += "flexagon";
        return name;
    }
    Flexagonator.namePiecesToName = namePiecesToName;
    function getPatsPrefixAsNumber(patsPrefix) {
        if (patsPrefix === undefined) {
            return null;
        }
        if (typeof patsPrefix === 'string') {
            return greekPrefixToNumber(patsPrefix);
        }
        return patsPrefix;
    }
    Flexagonator.getPatsPrefixAsNumber = getPatsPrefixAsNumber;
    function greekPrefixToNumber(prefix) {
        switch (prefix) {
            case 'di': return 2;
            case 'tri': return 3;
            case 'tetra': return 4;
            case 'penta': return 5;
            case 'hexa': return 6;
            case 'hepta': return 7;
            case 'octa': return 8;
            case 'ennea': return 9;
            case 'deca': return 10;
            case 'hendeca': return 11;
            case 'dodeca': return 12;
            case 'trideca': return 13;
            case 'tetradeca': return 14;
            case 'pentadeca': return 15;
            case 'hexadeca': return 16;
            case 'heptadeca': return 17;
            case 'octadeca': return 18;
            case 'enneadeca': return 19;
            case 'icosa': return 20;
            case 'icosihena': return 21;
            case 'icosidi': return 22;
            case 'icositri': return 23;
            case 'icositetra': return 24;
            default: return null;
        }
    }
    Flexagonator.greekPrefixToNumber = greekPrefixToNumber;
    function numberToGreekPrefix(n) {
        switch (n) {
            case 2: return 'di';
            case 3: return 'tri';
            case 4: return 'tetra';
            case 5: return 'penta';
            case 6: return 'hexa';
            case 7: return 'hepta';
            case 8: return 'octa';
            case 9: return 'ennea';
            case 10: return 'deca';
            case 11: return 'hendeca';
            case 12: return 'dodeca';
            case 13: return 'trideca';
            case 14: return 'tetradeca';
            case 15: return 'pentadeca';
            case 16: return 'hexadeca';
            case 17: return 'heptadeca';
            case 18: return 'octadeca';
            case 19: return 'enneadeca';
            case 20: return 'icosa';
            case 21: return 'icosihena';
            case 22: return 'icosidi';
            case 23: return 'icositri';
            case 24: return 'icositetra';
            default: return null;
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * convert a name like 'octagonal dodecaflexagon' into NamePieces,
     * which represents the different pieces extracted from the name
     *
     * [overall shape] [leaf shape] [face count]-[pat count prefix]flexagon [(details)]
     */
    function namePiecesFromName(name) {
        const words = name.split(' ');
        if (words.length === 0) {
            return {};
        }
        const [overallShape, leafShape] = getShapes(words.slice(0, words.length - 1));
        const faceCount = getFaceCount(words[words.length - 1]);
        const patsPrefix = getPatsPrefix(words[words.length - 1]);
        if (!overallShape && (leafShape === 'square' || leafShape === 'kite') && patsPrefix === 'octa') {
            // special handling of 'square|kite octaflexagon', since the shape is ambiguous
            return { overallShape: leafShape, patsPrefix: 'octa' };
        }
        return { overallShape, leafShape, faceCount, patsPrefix };
    }
    Flexagonator.namePiecesFromName = namePiecesFromName;
    // in 'triangular bronze penta-hexaflexagon', extract 'triangular' & 'bronze'
    function getShapes(words) {
        if (words.length === 0) {
            return [undefined, undefined];
        }
        const lastWord = words[words.length - 1];
        const secondToLastWord = words.length > 1 ? words[words.length - 2] : '';
        if (lastWord === 'regular' || lastWord === 'silver' || lastWord === 'bronze' || lastWord === 'right' || lastWord === 'isosceles'
            || (lastWord === 'triangle' && (secondToLastWord !== 'regular' && secondToLastWord !== 'silver' && secondToLastWord !== 'bronze' && secondToLastWord !== 'right' && secondToLastWord != 'isosceles'))) {
            // single word for leafShape
            const overallShape = words.length === 1 ? undefined : words.slice(0, words.length - 1).join(' ');
            return [overallShape, lastWord];
        }
        if (lastWord === 'triangle' && (secondToLastWord === 'regular' || secondToLastWord === 'silver' || secondToLastWord === 'bronze' || secondToLastWord === 'right' || secondToLastWord === 'isosceles')) {
            // two words for leafShape
            const overallShape = words.length === 2 ? undefined : words.slice(0, words.length - 2).join(' ');
            const leafShape = (secondToLastWord + ' ' + lastWord);
            return [overallShape, leafShape];
        }
        if (lastWord === 'square' || lastWord === 'rhombus' || lastWord === 'kite' || lastWord === 'trapezoid'
            || lastWord === 'pentagon' || lastWord === 'hexagon' || lastWord === 'heptagon' || lastWord === 'octagon') {
            // single word for leafShape
            const overallShape = words.length === 1 ? undefined : words.slice(0, words.length - 1).join(' ');
            return [overallShape, lastWord];
        }
        // only overall shape
        return [words.join(' '), undefined];
    }
    // in 'triangular bronze penta-hexaflexagon', extract 'penta'
    function getFaceCount(word) {
        const chunks = word.split('-');
        return chunks.length >= 2 ? chunks[0] : undefined;
    }
    // in 'triangular bronze penta-hexaflexagon', extract 'hexa'
    function getPatsPrefix(word) {
        const chunks = word.split('-');
        if (chunks.length === 0) {
            return undefined;
        }
        const last = chunks[chunks.length - 1];
        if (!last.endsWith('flexagon')) {
            return undefined;
        }
        const result = last.slice(0, last.length - 8);
        return result === '' ? undefined : result;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * convert NamePieces to a series of script commands, reporting any errors encountered
     */
    function namePiecesToScript(name) {
        const info = new InfoStorer();
        const patCount = Flexagonator.getPatsPrefixAsNumber(name.patsPrefix);
        // patsPrefix -> numPats
        if (name.patsPrefix) {
            if (patCount === null) {
                info.add({ error: { nameError: 'unknown patsPrefix', propValue: name.patsPrefix.toString() } });
            }
            else {
                info.add({ numPats: patCount });
            }
        }
        // patCount, !leafShape, !overallShape -> angles
        if (patCount && !name.leafShape && !name.overallShape) {
            const item = patCountToAnglesScript(patCount);
            info.add(item);
        }
        // leafShape -> angles
        if (name.leafShape) {
            const item = leafShapeToScript(name.leafShape, patCount);
            info.add(item);
        }
        // overallShape + patCount + leafShape -> angles, directions
        if (name.overallShape && patCount) {
            const item = overallShapeToScript(name.overallShape, patCount, name.leafShape);
            if (item === null) {
                info.add({ error: { nameError: 'unrecognized overall shape', propValue: name.overallShape + ' ' + name.patsPrefix } });
            }
            else {
                info.add(item);
            }
        }
        // pats -> pats
        if (name.pats) {
            const item = { pats: name.pats };
            info.add(item);
        }
        // generator | faceCount -> flexes | pats
        if (name.generator) {
            // a generating sequence is more specific than faceCount, so try it first
            info.add({ flexes: name.generator });
        }
        else if (name.faceCount) {
            const item = faceCountToScript(info, name.faceCount);
            info.add(item);
        }
        // if there were no complaints, validate that the results will produce a valid flexagon
        if (info.errors.length === 0) {
            info.validate();
        }
        return [info.asScript(), info.errors];
    }
    Flexagonator.namePiecesToScript = namePiecesToScript;
    function isNamePiecesError(result) {
        return result && result.nameError !== undefined;
    }
    Flexagonator.isNamePiecesError = isNamePiecesError;
    /** generating sequence for 'straight' strip with 6 faces,
     * designed so 1/2/3 are the common faces & it starts from 1/2 */
    Flexagonator.straightHexaGenerator = 'P* P+ >P>P P+ ^P P+ ^P^';
    // assuming pats meet in the middle, figure out the angles
    function patCountToAnglesScript(patCount) {
        const center = 360 / patCount;
        return { angles2: [center, (180 - center) / 2] };
    }
    // convert overallShape to ScriptItem by leveraging patsPrefix
    function overallShapeToScript(overallShape, n, leafShape) {
        // number of sides in overall polygon, not including specific shapes like 'rhombic'
        const sides = adjectiveToNumber(overallShape);
        // pyramid [regular] tetra
        if (overallShape === 'pyramid' && n === 4 && (!leafShape || leafShape.startsWith('regular'))) {
            return { angles2: [60, 60] };
        }
        // overallShape & n agree, with optional isosceles/silver/regular
        if ((sides === n && (!leafShape || leafShape.startsWith('isosceles')))
            || (sides === n && n == 4 && leafShape && leafShape.startsWith('silver'))
            || (sides === n && n == 6 && leafShape && leafShape.startsWith('regular'))) {
            return patCountToAnglesScript(n);
        }
        // stars, pats meet in the middle
        if (overallShape === 'star' && (n % 2 === 0 && n >= 6)) {
            switch (n) {
                // 6 & 8 are somewhat arbitrary, since an isosceles triangle wouldn't make a star
                case 6: return { angles2: [60, 15] };
                case 8: return { angles2: [45, 30] };
                // all others are isosceles triangles
                default: return { angles2: [360 / n, 360 / n] };
            }
        }
        // rings with a hole in the middle
        if (overallShape.endsWith('ring') && sides !== null) {
            // hexagonal ring regular n-flexagon
            if (sides === 6 && (!leafShape || leafShape === 'regular')) {
                switch (n) {
                    case 12:
                        return { angles2: [60, 60], directions: Flexagonator.Directions.make('//|/'.repeat(3)) };
                    case 14:
                        return { angles2: [60, 60], directions: Flexagonator.Directions.make('/|///|/'.repeat(2)) };
                    case 18:
                        return computeRing1Script(n);
                    // another possible hexagonal ring regular 18-flexagon...
                    // return { angles2: [60, 60], directions: Directions.make('//|/|/'.repeat(3)) };
                    case 24:
                        return { angles2: [60, 60], directions: Flexagonator.Directions.make('//|/|/|/'.repeat(3)) };
                }
            }
            // hexagonal ring silver tetradecaflexagon
            if (sides === 6 && n === 14 && leafShape && leafShape.startsWith('silver')) {
                const directions = Flexagonator.Directions.make('/|////|'.repeat(2));
                return { angles2: [90, 45], directions };
            }
            // octagonal ring tetradecaflexagon
            if (sides === 8 && n === 14 && (!leafShape || leafShape.startsWith('isosceles'))) {
                return { angles2: [72, 72], directions: Flexagonator.Directions.make('|//|//|'.repeat(2)) };
            }
            // (6,12), (8,16) e.g. hexagonal ring isosceles dodecaflexagon
            if (sides >= 6 && sides === n / 2 && (!leafShape || leafShape.startsWith('isosceles'))) {
                return computeRing3Script(n);
            }
            // (6,9) (8,12), (10,15), (12,18), (14,21) e.g. octagonal ring dodecaflexagon
            if (sides >= 6 && sides === 2 * n / 3) {
                return computeRing1Script(n);
            }
            // (3,12) (4,16) (5,20) (6,24) e.g. triangular ring dodecaflexagon
            if (sides >= 3 && sides === n / 4) {
                return computeRing2Script(n);
            }
        }
        // triangular bronze octadecaflexagon
        if (sides === 3 && (!leafShape || leafShape.startsWith('bronze')) && n === 18) {
            const directions = Flexagonator.Directions.make('/|//|/'.repeat(3));
            return { angles2: [30, 60], directions };
        }
        // hexagonal regular decaflexagon
        if (sides === 6 && (!leafShape || leafShape === 'regular') && n === 10) {
            return { angles2: [60, 60], directions: Flexagonator.Directions.make('//|//'.repeat(2)) };
        }
        // hexagonal silver dodecaflexagon
        if (sides === 6 && leafShape && leafShape.startsWith('silver') && n === 12) {
            const directions = Flexagonator.Directions.make('|//'.repeat(4));
            return { angles2: [45, 90], directions };
        }
        if (overallShape === 'rhombic' && (!leafShape || leafShape.startsWith('bronze'))) {
            if (n === 4) {
                // rhombic tetra
                return { angles2: [90, 30] };
            }
            else if (n === 12) {
                // rhombic dodeca
                const directions = Flexagonator.Directions.make('//||//'.repeat(2));
                return { angles2: [60, 90], directions };
            }
            else if (n === 16) {
                // rhombic hexadeca
                const directions = Flexagonator.Directions.make('//|//|//'.repeat(2));
                return { angles2: [30, 90], directions };
            }
        }
        // kite bronze octaflexagon
        if (overallShape === 'kite' && (!leafShape || leafShape.startsWith('bronze')) && n === 8) {
            const directions = Flexagonator.Directions.make('/|////|/');
            return { angles2: [90, 30], directions };
        }
        // pentagonal silver decaflexagon
        if (overallShape === 'pentagonal' && leafShape && leafShape.startsWith('silver') && n === 10) {
            const directions = Flexagonator.Directions.make('///|//|///');
            return { angles2: [45, 45], directions };
        }
        // bracelets
        if (overallShape === 'bracelet') {
            if (leafShape && leafShape.startsWith('silver')) {
                const directions = Flexagonator.Directions.make("/||/".repeat(n / 4));
                return { angles2: [45, 45], directions };
            }
            if (!leafShape || leafShape.startsWith('regular')) {
                const directions = Flexagonator.Directions.make("/|".repeat(n / 2));
                return { angles2: [60, 60], directions };
            }
        }
        // all pats meet in middle, leaves are right triangles
        if (sides !== null && sides >= 3 && sides === n / 2) {
            return { angles2: [360 / n, 90] };
        }
        return null;
    }
    /// compute a ring flexagon where there's a single pat along each of the n/3 inside edges that form a regular (n/3)-gon
    function computeRing1Script(n) {
        const sides = 2 * n / 3;
        const total = (sides - 2) * 180;
        // total = sides * a + n * b = sides * a + n * (180 - 2a)
        const a = (total - 180 * n) / (sides - 2 * n);
        const directions = Flexagonator.Directions.make('/|/'.repeat(n / 3));
        return { angles2: [a, 180 - 2 * a], directions };
    }
    /// compute a ring flexagon where there are 2 right triangle pats along each of the n/4 inside edges that form a regular (n/4)-gon
    function computeRing2Script(n) {
        const sides = n / 4;
        const a = 180 * (sides - 2) / (4 * sides); // each corner of the outer polygon has 4 triangles in it
        const directions = Flexagonator.Directions.make('/||/'.repeat(n / 4));
        return { angles2: [90 - a, a], directions };
    }
    /// compute a ring flexagon where there are 2 isosceles triangle pats along each of the n/2 inside edges
    function computeRing3Script(n) {
        // if you drew a reguluar (n/4)-gon, each corner would contain 2 full triangles & 2 half triangles
        const sides = n / 4;
        const a = ((180 * (sides - 2)) / sides) / 3;
        const directions = Flexagonator.Directions.make('/||/'.repeat(n / 4));
        return { angles2: [(180 - a) / 2, a], directions };
    }
    // convert leafShape to ScriptItem
    function leafShapeToScript(leafShape, n) {
        if (n) {
            // leafShape & patCount may require a specific orientation
            if ((leafShape.startsWith('silver') || leafShape.startsWith('right')) && n === 4) {
                return { angles2: [90, 45] };
            }
            else if (leafShape.startsWith('bronze') && n === 4) {
                return { angles2: [90, 30] };
            }
            else if ((leafShape.startsWith('bronze') || leafShape.startsWith('right')) && n === 6) {
                return { angles2: [60, 90] };
            }
            else if ((leafShape.startsWith('silver') || leafShape.startsWith('right')) && n === 8) {
                return { angles2: [45, 90] };
            }
            else if ((leafShape.startsWith('bronze') || leafShape.startsWith('right')) && n === 12) {
                return { angles2: [30, 90] };
            }
            else if (leafShape.startsWith('right') && n % 2 === 0) {
                return { angles2: [360 / n, 90] };
            }
        }
        // just leafShape by itself
        switch (leafShape) {
            case 'triangle':
            case 'regular':
                return { angles2: [60, 60] };
            case 'silver':
            case 'silver triangle':
                return { angles2: [45, 45] };
            case 'bronze':
            case 'bronze triangle':
                return { angles2: [30, 60] };
            case 'right':
            case 'right triangle':
            case 'isosceles':
            case 'isosceles triangle':
                return {}; // not enough information
            default:
                return { error: { nameError: 'unknown leafShape', propValue: leafShape } };
        }
    }
    function faceCountToScript(info, faceCount) {
        const n = Flexagonator.greekPrefixToNumber(faceCount);
        if (n === null || n < 2) {
            return { error: { nameError: 'need a face count of at least 2', propValue: faceCount } };
        }
        else if (n === 2) {
            // don't need to do anything because it defaults to 2 faces
            return {};
        }
        if (info.doPatsMeetInCenter() && info.isEven()) {
            // use a generating sequence
            return faceCountToFlexes(n);
        }
        // create pat structure if possible
        const numPats = info.getNumPats();
        return numPats === null ? {} : faceCountToPats(n, numPats);
    }
    function faceCountToFlexes(n) {
        if (n < 6) {
            // 3, 4, 5 are all unambiguous
            return { flexes: 'P*'.repeat(n - 2) };
        }
        else if (n === 6) {
            // we'll assume they want the "straight strip" version
            return {
                flexes: Flexagonator.straightHexaGenerator,
                error: { nameError: 'warning: there are multiple possibilities for face count', propValue: n.toString() }
            };
        }
        // >6 is ambiguous
        return {
            flexes: 'P*^>'.repeat(n - 2),
            error: { nameError: 'warning: there are multiple possibilities for face count', propValue: n.toString() }
        };
    }
    function faceCountToPats(n, numPats) {
        if (n % 2 === 0) {
            // even number of faces, so every pat is the same
            const pats = repeat(getPatStructure(n / 2), numPats);
            return { pats };
        }
        else if (numPats % 2 === 0) {
            // odd number of faces & even number of pats, so pats alternate structure
            const one = getPatStructure(Math.floor(n / 2));
            const two = getPatStructure(Math.floor(n / 2) + 1);
            const pair = one.concat(two);
            const pats = repeat(pair, numPats / 2);
            return { pats };
        }
        // can't create an odd number of faces if there's an odd number of pats
        return {};
    }
    // create a well-balanced pat structure with the given number of faces in it
    function getPatStructure(n) {
        // could put more effort into coming up with a general algorithm,
        // but this is good enough for now
        switch (n) {
            case 1: return [0];
            case 2: return [[0, 0]];
            case 3: return [[0, [0, 0]]];
            case 4: return [[[0, 0], [0, 0]]];
            case 5: return [[[[0, 0], 0], [0, 0]]];
            case 6: return [[[[0, 0], 0], [[0, 0], 0]]];
            case 7: return [[[[0, 0], [0, 0]], [[0, 0], 0]]];
            case 8: return [[[[0, 0], [0, 0]], [[0, 0], [0, 0]]]];
            case 9: return [[[[[0, 0], 0], [0, 0]], [[0, 0], [0, 0]]]];
            case 10: return [[[[[0, 0], 0], [0, 0]], [[[0, 0], 0], [0, 0]]]];
            case 11: return [[[[[0, 0], 0], [[0, 0], 0]], [[[0, 0], 0], [0, 0]]]];
            case 12: return [[[[[0, 0], 0], [[0, 0], 0]], [[[0, 0], 0], [[0, 0], 0]]]];
        }
        return [];
    }
    function adjectiveToNumber(adj) {
        if (adj.startsWith('triangular')) {
            return 3;
        }
        else if (adj.startsWith('square')) {
            return 4;
        }
        else if (adj.startsWith('pentagonal')) {
            return 5;
        }
        else if (adj.startsWith('hexagonal')) {
            return 6;
        }
        else if (adj.startsWith('heptagonal')) {
            return 7;
        }
        else if (adj.startsWith('octagonal')) {
            return 8;
        }
        else if (adj.startsWith('enneagonal')) {
            return 9;
        }
        else if (adj.startsWith('decagonal')) {
            return 10;
        }
        else if (adj.startsWith('hendecagonal')) {
            return 11;
        }
        else if (adj.startsWith('dodecagonal')) {
            return 12;
        }
        else if (adj.startsWith('tridecagonal')) {
            return 13;
        }
        else if (adj.startsWith('tetradecagonal')) {
            return 14;
        }
        else if (adj.startsWith('pentadecagonal')) {
            return 15;
        }
        else if (adj.startsWith('hexadecagonal')) {
            return 16;
        }
        return null;
    }
    // repeat an array
    function repeat(a, n) {
        let r = [];
        for (let i = 0; i < n; i++) {
            r = r.concat(a);
        }
        return r;
    }
    // convenient way to track script & errors
    class InfoStorer {
        constructor() {
            this.description = {};
            this.errors = [];
        }
        add(item) {
            this.description = Object.assign(Object.assign({}, this.description), item);
            if (this.description.error) {
                this.errors.push(this.description.error);
            }
        }
        asScript() {
            const script = [];
            if (this.description.pats) {
                script.push({ pats: this.description.pats });
            }
            else if (this.description.numPats) {
                script.push({ numPats: this.description.numPats });
            }
            if (this.description.angles2) {
                script.push({ angles2: this.description.angles2 });
            }
            if (this.description.directions) {
                script.push({ directions: this.description.directions.asRaw() });
            }
            if (this.description.flexes) {
                script.push({ flexes: this.description.flexes });
            }
            return script;
        }
        getNumPats() {
            if (this.description.numPats) {
                return this.description.numPats;
            }
            else if (this.description.pats) {
                return this.description.pats.length;
            }
            return null;
        }
        isEven() {
            const numPats = this.getNumPats();
            return numPats === null ? false : numPats % 2 === 0;
        }
        doPatsMeetInCenter() {
            return this.description.directions === undefined;
        }
        validate() {
            // need either numPats or pats
            if (!this.description.numPats && !this.description.pats) {
                this.errors.push({ nameError: 'missing the number of pats' });
            }
            // numPats, pats.length, & directions.length should all match
            const a = this.description.numPats;
            const b = this.description.pats ? this.description.pats.length : 0;
            const c = this.description.directions ? this.description.directions.getCount() : 0;
            if (a !== 0 && b !== 0 && a !== b) {
                this.errors.push({ nameError: 'numPats, pats, and directions should represent the same count' });
            }
            else if (a !== 0 && c !== 0 && a !== c) {
                this.errors.push({ nameError: 'numPats, pats, and directions should represent the same count' });
            }
            else if (b !== 0 && c !== 0 && b !== c) {
                this.errors.push({ nameError: 'numPats, pats, and directions should represent the same count' });
            }
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * Generate new leaf ids so that, when unfolded, the ids appear in order.
     * (Leaf ids may have been numbered as they were created, which can feel random.)
     */
    function normalizeIds(pats) {
        const leafTree = pats.map(p => p.getAsLeafTree());
        const unfolded = Flexagonator.unfold(leafTree);
        if (Flexagonator.isTreeError(unfolded)) {
            return pats;
        }
        // this gives us the leaves in order, using the original ids
        const leaves = unfolded.map(leaf => leaf.id);
        // map original id to ordered id
        // e.g., leaves of [2,-3,-1] => {2:1, 3:-2, 1:-3}
        const map = {};
        leaves.forEach((original, i) => map[Math.abs(original)] = (i + 1) * Math.sign(original));
        return pats.map(p => p.remap(map));
    }
    Flexagonator.normalizeIds = normalizeIds;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function parseFlexSequence(sequence) {
        const track = new TrackState(sequence);
        for (let c of sequence) {
            track.step(c);
        }
        track.done();
        return track.getNames();
    }
    Flexagonator.parseFlexSequence = parseFlexSequence;
    // track a (nested sequence) when we recurse
    class SequenceState {
        constructor(index) {
            this.start = -1;
            this.lookingForNumber = false;
            this.number = "";
            this.names = [];
            this.index = index;
        }
        // expand (AB)x2 into ABAB
        getFlexes() {
            const flexes = [];
            const count = Number.parseInt(this.number);
            for (let i = 0; i < count; i++) {
                for (const flex of this.names) {
                    flexes.push(flex);
                }
            }
            return flexes;
        }
    }
    // parse & track the state as we recurse through a flex sequence
    class TrackState {
        constructor(sequence) {
            this.states = [];
            this.sequence = sequence;
            this.states.push(new SequenceState(0));
        }
        getNames() {
            const state = this.states[this.states.length - 1];
            return state.names;
        }
        step(c) {
            let state = this.states[this.states.length - 1];
            if (c == '(') {
                state = this.endFlex(state);
                state = new SequenceState(state.index);
                this.states.push(state);
            }
            else if (c == ')') {
                state = this.endFlex(state);
                state.lookingForNumber = true;
            }
            else if (state.lookingForNumber && ('0' <= c && c <= '9')) {
                state.number += c;
            }
            else if (c === '>' || c === '<' || c === '^' || c === '~' || ('A' <= c && c <= 'Z')) {
                // we're starting a new flex, so end the previous one
                state = this.endFlex(state);
                state.start = state.index;
            }
            state.index++;
        }
        done() {
            for (let i = 0, len = this.states.length; i < len; i++) {
                this.endFlex(this.states[this.states.length - 1]);
            }
        }
        endFlex(state) {
            if (state.lookingForNumber) {
                const flexes = state.getFlexes();
                const laststate = state;
                this.states.pop();
                state = this.states[this.states.length - 1];
                for (const flex of flexes) {
                    state.names.push(flex);
                }
                state.index = laststate.index;
                state.start = laststate.index;
            }
            else {
                this.addFlex(state);
            }
            return state;
        }
        addFlex(state) {
            if (state.start != -1) {
                const substr = this.sequence.substring(state.start, state.index).trim();
                if (substr.length > 0) {
                    state.names.push(Flexagonator.makeFlexName(substr));
                }
            }
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** parse strings like "[0,[0,0]]" and "2,4" to generate the pat structure needed for the given number of pats */
    function parsePats(rawPats, patCount) {
        const s = rawPats.trim();
        if (s[0] === '[') {
            return parseAsArray(s, patCount);
        }
        return parseShortcuts(s, patCount);
    }
    Flexagonator.parsePats = parsePats;
    /** assume we have something like "[1,[2,3]]" */
    function parseAsArray(rawPats, patCount) {
        try {
            const parsed = JSON.parse(rawPats);
            if (!Array.isArray(parsed)) {
                return false;
            }
            return repeatPats(parsed, patCount);
        }
        catch (e) {
            return false;
        }
    }
    /** assume we have a list of various pat shortcuts (like 4=[[0,0],[0,0]]), e.g., "21,1,4" */
    function parseShortcuts(rawPats, patCount) {
        const result = [];
        const pieces = rawPats.split(',');
        for (let i = 0; i < pieces.length; i++) {
            const piece = pieces[i].trim();
            switch (piece) {
                case '1':
                    result.push(0);
                    break;
                case '2':
                    result.push([0, 0]);
                    break;
                // 3
                case '12':
                    result.push([0, [0, 0]]);
                    break;
                case '21':
                    result.push([[0, 0], 0]);
                    break;
                // 4
                case '4':
                    result.push([[0, 0], [0, 0]]);
                    break;
                case '211':
                    result.push([[[0, 0], 0], 0]);
                    break;
                case '112':
                    result.push([0, [0, [0, 0]]]);
                    break;
                case '12-1':
                    result.push([[0, [0, 0]], 0]);
                    break;
                case '1-21':
                    result.push([0, [[0, 0], 0]]);
                    break;
                // 8
                case '8':
                    result.push([[[0, 0], [0, 0]], [[0, 0], [0, 0]]]);
                    break;
                // unhandled
                default:
                    return false;
            }
        }
        return repeatPats(result, patCount);
    }
    /** if necessary, keep repeating what's in 'parsed' till we have 'patCount' entries */
    function repeatPats(parsed, patCount) {
        if (parsed.length === patCount) {
            return parsed;
        }
        const result = [];
        for (let i = 0, j = 0; i < patCount; i++) {
            result.push(parsed[j]);
            j = (j === parsed.length - 1) ? 0 : j + 1;
        }
        return result;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    let WhereLeaf;
    (function (WhereLeaf) {
        WhereLeaf[WhereLeaf["NotFound"] = 0] = "NotFound";
        WhereLeaf[WhereLeaf["Found"] = 1] = "Found";
        WhereLeaf[WhereLeaf["FoundFlipped"] = 2] = "FoundFlipped";
    })(WhereLeaf = Flexagonator.WhereLeaf || (Flexagonator.WhereLeaf = {}));
    /*
      Make a pat out of nested binary arrays, where leaves are
      represented by numbers, with negative numbers representing
      leaves that are flipped over
      e.g. [1, [[-2, 3], 4]]
    */
    function makePat(leaves) {
        if (!Array.isArray(leaves)) {
            if (typeof (leaves) !== "number") {
                return { reason: Flexagonator.TreeCode.LeafIdMustBeInt, context: leaves };
            }
            return new PatLeaf(leaves);
        }
        if (leaves.length !== 2) {
            return { reason: Flexagonator.TreeCode.ArrayMustHave2Items, context: leaves };
        }
        const left = makePat(leaves[0]);
        if (Flexagonator.isTreeError(left)) {
            return left;
        }
        const right = makePat(leaves[1]);
        if (Flexagonator.isTreeError(right)) {
            return right;
        }
        return new PatPair(left, right);
    }
    Flexagonator.makePat = makePat;
    function combinePats(pat1, pat2) {
        return new PatPair(pat1, pat2);
    }
    Flexagonator.combinePats = combinePats;
    // single leaf
    class PatLeaf {
        constructor(id) {
            this.id = id;
        }
        isEqual(pat) {
            return pat !== undefined && this.id === pat.id;
        }
        isEqualStructure(pat) {
            return pat !== undefined && pat.id !== undefined; // are they both PatLeafs?
        }
        getLeafCount() {
            return 1;
        }
        makeCopy() {
            return new PatLeaf(this.id);
        }
        makeFlipped() {
            return new PatLeaf(-this.id);
        }
        remap(map) {
            const newid = this.id > 0 ? map[this.id] : -map[-this.id];
            return new PatLeaf(newid);
        }
        getAsLeafTree() {
            return this.id;
        }
        getTop() {
            return this.id;
        }
        getBottom() {
            return -this.id;
        }
        getStructure() {
            return '-';
        }
        getStructureLTEId(id) {
            const thisId = Math.abs(this.id);
            return thisId <= id ? this.id.toString() : '';
        }
        getString() {
            return this.id.toString();
        }
        findId(id) {
            if (this.id == id) {
                return WhereLeaf.Found;
            }
            return (this.id == -id) ? WhereLeaf.FoundFlipped : WhereLeaf.NotFound;
        }
        findMinId() {
            return Math.abs(this.id);
        }
        findMaxId() {
            return Math.abs(this.id);
        }
        unfold() {
            return null;
        }
        hasPattern(pattern) {
            return typeof (pattern) === "number";
        }
        matchPattern(pattern) {
            if (!this.hasPattern(pattern)) {
                return { expected: pattern, actual: this.id };
            }
            const n = pattern;
            const match = [];
            match[Math.abs(n)] = n >= 0 ? this : this.makeFlipped();
            return match;
        }
        createPattern(pattern, getNextId, splits) {
            if (typeof (pattern) === "number") {
                return this.makeCopy();
            }
            // we want the first leaf to use this.id, all others use getNextId
            let usedId = false;
            const patternArray = pattern;
            const newLeft = this.subCreate(patternArray[0], () => {
                if (usedId)
                    return getNextId();
                usedId = true;
                return this.id;
            });
            const newRight = this.subCreate(patternArray[1], getNextId);
            const newpat = new PatPair(newLeft, newRight);
            splits.push(newpat);
            return newpat;
        }
        // recurse through 'pattern', creating substructure as needed
        subCreate(pattern, getNextId) {
            if (typeof (pattern) === "number") {
                return new PatLeaf(getNextId());
            }
            const patternArray = pattern;
            const newLeft = this.subCreate(patternArray[0], getNextId);
            const newRight = this.subCreate(patternArray[1], getNextId);
            return new PatPair(newLeft, newRight);
        }
        replaceZeros(getNextId) {
            return this.id === 0 ? new PatLeaf(getNextId()) : this;
        }
    }
    // pair of sub-pats
    class PatPair {
        constructor(left, right) {
            this.left = left;
            this.right = right;
        }
        isEqual(pat) {
            if (pat === undefined) {
                return false;
            }
            return this.left.isEqual(pat.left) && this.right.isEqual(pat.right);
        }
        isEqualStructure(pat) {
            const other = pat;
            if (other === undefined || other.left === undefined) {
                return false;
            }
            return this.left.isEqualStructure(other.left) && this.right.isEqualStructure(other.right);
        }
        getLeafCount() {
            return this.left.getLeafCount() + this.right.getLeafCount();
        }
        makeCopy() {
            return new PatPair(this.left.makeCopy(), this.right.makeCopy());
        }
        makeFlipped() {
            return new PatPair(this.right.makeFlipped(), this.left.makeFlipped());
        }
        remap(map) {
            return new PatPair(this.left.remap(map), this.right.remap(map));
        }
        getAsLeafTree() {
            return [this.left.getAsLeafTree(), this.right.getAsLeafTree()];
        }
        getTop() {
            return this.left.getTop();
        }
        getBottom() {
            return this.right.getBottom();
        }
        getStructure() {
            return '[' + this.left.getStructure() + ' ' + this.right.getStructure() + ']';
        }
        getStructureLTEId(id) {
            const left = this.left.getStructureLTEId(id);
            const right = this.right.getStructureLTEId(id);
            if (left === '' && right === '') {
                return '';
            }
            return '[' + (left === '' ? ':' : left) + ' ' + (right === '' ? ':' : right) + ']';
        }
        getString() {
            return '[' + this.left.getString() + ',' + this.right.getString() + ']';
        }
        findId(id) {
            const a = this.left.findId(id);
            if (a !== WhereLeaf.NotFound) {
                return a;
            }
            return this.right.findId(id);
        }
        findMinId() {
            const a = this.left.findMinId();
            const b = this.right.findMinId();
            return Math.min(a, b);
        }
        findMaxId() {
            const a = this.left.findMaxId();
            const b = this.right.findMaxId();
            return Math.max(a, b);
        }
        unfold() {
            return [this.right, this.left.makeFlipped()];
        }
        hasPattern(pattern) {
            if (!Array.isArray(pattern)) {
                return true;
            }
            if (pattern.length !== 2) {
                return false;
            }
            return this.left.hasPattern(pattern[0]) && this.right.hasPattern(pattern[1]);
        }
        matchPattern(pattern) {
            if (typeof (pattern) === "number") {
                const n = pattern;
                const match = [];
                match[Math.abs(n)] = n >= 0 ? this : this.makeFlipped();
                return match;
            }
            if (Array.isArray(pattern) && pattern.length === 2) {
                const leftMatch = this.left.matchPattern(pattern[0]);
                if (Flexagonator.isPatternError(leftMatch)) {
                    return leftMatch;
                }
                const rightMatch = this.right.matchPattern(pattern[1]);
                if (Flexagonator.isPatternError(rightMatch)) {
                    return rightMatch;
                }
                let join = leftMatch;
                for (let i in rightMatch) {
                    join[i] = rightMatch[i];
                }
                return join;
            }
            return { expected: pattern, actual: [this.left, this.right] };
        }
        createPattern(pattern, getNextId, splits) {
            if (typeof (pattern) === "number") {
                return this.makeCopy();
            }
            const patternArray = pattern;
            const newLeft = this.left.createPattern(patternArray[0], getNextId, splits);
            const newRight = this.right.createPattern(patternArray[1], getNextId, splits);
            return new PatPair(newLeft, newRight);
        }
        replaceZeros(getNextId) {
            const newLeft = this.left.replaceZeros(getNextId);
            const newRight = this.right.replaceZeros(getNextId);
            return new PatPair(newLeft, newRight);
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    Flexagonator.hexaHexaLeafTree = [
        [1, -18], [[4, -5], [2, -3]],
        [7, -6], [[10, -11], [8, -9]],
        [13, -12], [[16, -17], [14, -15]],
    ];
    const hh1 = { label: "1", color: 0x2E4172 };
    const hh2 = { label: "2", color: 0x2B803E };
    const hh3 = { label: "3", color: 0xAA4439 };
    const hh4 = { label: "4", color: 0x622870 };
    const hh5 = { label: "5", color: 0xffff00 };
    const hh6 = { label: "6", color: 0x553900 };
    Flexagonator.hexaHexaProperties = [
        { front: hh1, back: hh4 }, // 1
        { front: hh2, back: hh5 }, // 2
        { front: hh3, back: hh5 }, // 3
        { front: hh1, back: hh6 }, // 4
        { front: hh2, back: hh6 }, // 5
        { front: hh3, back: hh4 }, // 6
        { front: hh1, back: hh4 }, // 7
        { front: hh2, back: hh5 }, // 8
        { front: hh3, back: hh5 }, // 9
        { front: hh1, back: hh6 }, // 10
        { front: hh2, back: hh6 }, // 11
        { front: hh3, back: hh4 }, // 12
        { front: hh1, back: hh4 }, // 13
        { front: hh2, back: hh5 }, // 14
        { front: hh3, back: hh5 }, // 15
        { front: hh1, back: hh6 }, // 16
        { front: hh2, back: hh6 }, // 17
        { front: hh3, back: hh4 }, // 18
    ];
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function isFlexFromSequence(result) {
        return result.sequence !== undefined;
    }
    Flexagonator.isFlexFromSequence = isFlexFromSequence;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    function makeScript(fm) {
        const script = [];
        script.push(makePats(fm));
        if (fm.getFlexHistory().length > 0) {
            script.push(makeFlexHistory(fm));
        }
        if (fm.leafProps.getRawProps().length !== 0) {
            script.push({ leafProps: fm.leafProps.getRawProps() });
        }
        script.push(makeFlexesToSearch(fm));
        script.push({ angles2: fm.getAngleInfo().getAngles(fm.flexagon) });
        const directions = fm.getDirections();
        if (directions) {
            script.push({ directions: directions.asString(true) });
        }
        return script;
    }
    Flexagonator.makeScript = makeScript;
    function makePats(fm) {
        const flexagon = fm.getBaseFlexagon();
        return { pats: flexagon.getAsLeafTrees() };
    }
    function makeFlexHistory(fm) {
        const flexes = fm.getFlexHistory().join(' ');
        return { flexes: flexes };
    }
    function makeFlexesToSearch(fm) {
        let searchFlexes = "";
        let firstFlex = true;
        for (let name in fm.flexesToSearch) {
            if (firstFlex) {
                firstFlex = false;
            }
            else {
                searchFlexes += ' ';
            }
            searchFlexes += name;
        }
        return { searchFlexes: searchFlexes };
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // create a flexagon, apply a script, and return it
    function createFromScript(script) {
        const result = Flexagonator.Flexagon.makeFromTree([1, 2, 3, 4, 5, 6]);
        const fm = Flexagonator.FlexagonManager.make(result);
        return runScript(fm, script);
    }
    Flexagonator.createFromScript = createFromScript;
    // apply a script to an existing flexagon (though it may create a new flexagon)
    function runScript(fm, script) {
        for (let item of script) {
            const result = runScriptItem(fm, item);
            if (Flexagonator.isFlexError(result) || Flexagonator.isTreeError(result)) {
                return result;
            }
            fm = result;
        }
        return fm;
    }
    Flexagonator.runScript = runScript;
    function runScriptString(fm, str) {
        try {
            const script = JSON.parse(str);
            return runScript(fm, script);
        }
        catch (error) {
            return { reason: Flexagonator.TreeCode.ParseError, context: error };
        }
    }
    Flexagonator.runScriptString = runScriptString;
    function runScriptItem(fm, item) {
        if (item.name !== undefined) {
            const pieces = Flexagonator.namePiecesFromName(item.name);
            const [script, errors] = Flexagonator.namePiecesToScript(pieces);
            if (script.length > 0) {
                const result = runScript(fm, script);
                return result;
            }
            if (errors.length > 0) {
                // return error
            }
            return fm;
        }
        if (item.pats !== undefined) {
            const result = Flexagonator.Flexagon.makeFromTreeCheckZeros(item.pats);
            if (Flexagonator.isTreeError(result)) {
                return result;
            }
            fm = Flexagonator.FlexagonManager.makeFromPats(result, fm);
        }
        if (item.numPats !== undefined) {
            const pats = [];
            for (var i = 1; i <= item.numPats; i++) {
                pats.push(i);
            }
            const result = Flexagonator.Flexagon.makeFromTree(pats);
            if (Flexagonator.isTreeError(result)) {
                return result;
            }
            fm = Flexagonator.FlexagonManager.make(result);
        }
        // version that's maintained properly during flexing
        if (item.angles2 !== undefined) {
            if (item.angles2[0] && item.angles2[1]) {
                fm.setAngles(item.angles2[0], item.angles2[1], true);
            }
            else {
                fm.setIsosceles(true);
            }
        }
        // deprecated version for old scripts that rely on the incorrect behavior
        if (item.angles !== undefined) {
            if (item.angles[0] && item.angles[1]) {
                fm.setAngles(item.angles[0], item.angles[1], false);
            }
            else {
                fm.setIsosceles(false);
            }
        }
        if (item.directions !== undefined) {
            const directions = Flexagonator.Directions.make(item.directions);
            fm.setDirections(directions);
        }
        if (item.flexes !== undefined) {
            const result = fm.applyFlexes(item.flexes, false);
            if (Flexagonator.isFlexError(result)) {
                return result;
            }
        }
        if (item.reverseFlexes !== undefined) {
            const result = fm.applyInReverse(item.reverseFlexes);
            if (Flexagonator.isFlexError(result)) {
                return result;
            }
        }
        if (item.flexAndColor !== undefined) {
            const result = Flexagonator.flexAndColor(fm, item.flexAndColor);
            if (Flexagonator.isFlexError(result)) {
                return result;
            }
        }
        if (item.normalizeIds !== undefined) {
            fm.normalizeIds();
        }
        if (item.setLabels !== undefined) {
            fm.flexagon = fm.flexagon.normalizeIds();
            const newProps = Flexagonator.convertLeafProps(item.setLabels.labels, item.setLabels.repeat, item.setLabels.colors);
            const leafProps = new Flexagonator.PropertiesForLeaves(newProps);
            fm.leafProps = leafProps;
        }
        if (item.leafProps !== undefined) {
            fm.leafProps = new Flexagonator.PropertiesForLeaves(item.leafProps);
        }
        if (item.setFace !== undefined) {
            doSetFace(fm, item.setFace);
        }
        if (item.unsetFace !== undefined) {
            doUnsetFace(fm, item.unsetFace);
        }
        if (item.labelAsTree !== undefined) {
            const props = Flexagonator.labelAsTree(fm.flexagon, item.labelAsTree);
            fm.leafProps = props;
        }
        if (item.addFlex !== undefined) {
            const f = item.addFlex;
            const name = f.name ? f.name : f.shorthand;
            const fr = angleOrderToFlexRotation(f.rotation);
            const newFlex = Flexagonator.isFlexFromSequence(f)
                ? Flexagonator.makeFlexFromSequence(f.sequence, fm.allFlexes, name, fr, f.inputDirs, f.outputDirs, f.orderOfDirs)
                : Flexagonator.makeFlex(name, f.input, f.output, fr, f.inputDirs, f.outputDirs, f.orderOfDirs);
            if (Flexagonator.isFlexError(newFlex)) {
                return newFlex;
            }
            fm.allFlexes[f.shorthand] = newFlex;
            // & add the inverse
            fm.allFlexes[f.shorthand + "'"] = newFlex.createInverse();
        }
        if (item.addMorphFlexes || item.addHalfFlexes) {
            const morphs = Flexagonator.makeMorphFlexes(fm.flexagon.getPatCount());
            fm.addFlexes(morphs);
        }
        // manipulate the flex history: "clear", "undo", "redo", "reset"
        if (item.history !== undefined) {
            switch (item.history) {
                case "clear":
                    fm.clearHistory();
                    break;
                case "undo":
                    fm.undo();
                    break;
                case "redo":
                    fm.redo();
                    break;
                case "reset":
                    fm.undoAll();
                    break;
            }
        }
        if (item.searchFlexes !== undefined) {
            const flexNames = Flexagonator.parseFlexSequence(item.searchFlexes);
            const flexes = {};
            for (const flexName of flexNames) {
                const f = flexName.flexName;
                const flex = fm.allFlexes[f];
                if (flex !== undefined) {
                    flexes[f] = flex;
                }
            }
            fm.flexesToSearch = flexes;
        }
        return fm;
    }
    Flexagonator.runScriptItem = runScriptItem;
    function doSetFace(fm, setFace) {
        if (setFace.front !== undefined) {
            if (setFace.front.label !== undefined) {
                fm.setFaceLabel(setFace.front.label, true);
            }
            if (setFace.front.color !== undefined) {
                fm.setFaceColor(setFace.front.color, true);
            }
        }
        if (setFace.back !== undefined) {
            if (setFace.back.label !== undefined) {
                fm.setFaceLabel(setFace.back.label, false);
            }
            if (setFace.back.color !== undefined) {
                fm.setFaceColor(setFace.back.color, false);
            }
        }
    }
    function doUnsetFace(fm, unsetFace) {
        if (unsetFace.front !== undefined) {
            if (unsetFace.front.label !== undefined) {
                fm.setUnsetFaceLabel(unsetFace.front.label, true);
            }
            if (unsetFace.front.color !== undefined) {
                fm.setUnsetFaceColor(unsetFace.front.color, true);
            }
        }
        if (unsetFace.back !== undefined) {
            if (unsetFace.back.label !== undefined) {
                fm.setUnsetFaceLabel(unsetFace.back.label, false);
            }
            if (unsetFace.back.color !== undefined) {
                fm.setUnsetFaceColor(unsetFace.back.color, false);
            }
        }
    }
    function angleOrderToFlexRotation(order) {
        switch (order) {
            case 'ABC': return Flexagonator.FlexRotation.None;
            case 'ACB': return Flexagonator.FlexRotation.ACB;
            case 'BAC': return Flexagonator.FlexRotation.BAC;
            case 'BCA': return Flexagonator.FlexRotation.BCA;
            case 'CAB': return Flexagonator.FlexRotation.CAB;
            case 'CBA': return Flexagonator.FlexRotation.CBA;
            case 'Right': return Flexagonator.FlexRotation.Right;
            case 'Left': return Flexagonator.FlexRotation.Left;
        }
        return Flexagonator.FlexRotation.None;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // tracks flexagons we've seen before
    class Tracker {
        constructor(states, current) {
            this.states = [];
            this.keyId = 1;
            this.current = 0; // 0-based index into states
            this.states = states;
            this.current = current;
        }
        static make(flexagon) {
            const tracker = new Tracker([], 0);
            tracker.findMaybeAdd(flexagon);
            return tracker;
        }
        getTotalStates() {
            return this.states.length;
        }
        getCurrentState() {
            return this.current;
        }
        getCopy() {
            // create a shallow copy of this object's state
            // (since its members are immutable)
            const states = this.states.map(x => x);
            return new Tracker(states, this.current);
        }
        // if we've seen this flexagon before, return which one,
        // else add it to our list and return null
        findMaybeAdd(flexagon) {
            const state = new State(flexagon, this.keyId);
            const i = this.getIndex(state);
            if (i !== null) {
                this.current = i;
                return i;
            }
            this.states.push(state);
            this.current = this.states.length - 1;
            return null;
        }
        // returns which state we have, or null if we haven't seen it before
        getIndex(state) {
            const i = this.states.findIndex(thisState => thisState.isEqualTo(state));
            return i !== -1 ? i : null;
        }
    }
    Flexagonator.Tracker = Tracker;
    // similar to Tracker, but just tracks the visible leaves,
    // which might have duplicates across all the flexagon states
    class TrackerVisible {
        constructor(flexagons) {
            this.states = [];
            this.keyId = 1;
            for (let flexagon of flexagons) {
                const pseudo = TrackerVisible.toPseudoFlexagon(flexagon.getTopIds(), flexagon.getBottomIds());
                const state = new State(pseudo, this.keyId);
                this.states.push(state);
            }
        }
        // returns the indices of flexagons with the same visible leaves, if any
        find(top, bottom) {
            const results = [];
            const pseudo = TrackerVisible.toPseudoFlexagon(top, bottom);
            const toFind = new State(pseudo, this.keyId);
            let i = 0;
            for (let state of this.states) {
                if (state.isEqualTo(toFind)) {
                    results.push(i);
                }
                i++;
            }
            return results;
        }
        // pretend the visible leaves describe a flexagon
        static toPseudoFlexagon(top, bottom) {
            const visible = [];
            for (let i = 0; i < top.length; i++) {
                visible.push([top[i], bottom[i]]);
            }
            return Flexagonator.Flexagon.makeFromTree(visible);
        }
    }
    Flexagonator.TrackerVisible = TrackerVisible;
    // represents a flexagon state in such a way that's quick to compare
    // against others, while ignoring how it's rotated or flipped
    class State {
        constructor(flexagon, key) {
            this.state = "";
            const patcount = flexagon.getPatCount();
            // find which pat 'key' is in and whether it's face up or down
            const where = this.findKey(flexagon, key);
            // build up a string that represents the normalized form,
            // where 'id' is faceup in the first pat
            if (where.faceup) {
                for (let i = 0; i < patcount; i++) {
                    const patnum = (i + where.whichpat) % patcount;
                    this.state += flexagon.pats[patnum].getString() + ",";
                }
            }
            else {
                for (let i = 0; i < patcount; i++) {
                    const patnum = (where.whichpat - i + patcount) % patcount;
                    this.state += flexagon.pats[patnum].makeFlipped().getString() + ",";
                }
            }
        }
        isEqualTo(other) {
            return this.state === other.state;
        }
        findKey(flexagon, key) {
            const patcount = flexagon.getPatCount();
            let whichpat = -1;
            let faceup = true;
            for (let i = 0; i < patcount; i++) {
                const whereKey = flexagon.pats[i].findId(key);
                if (whereKey != Flexagonator.WhereLeaf.NotFound) {
                    whichpat = i;
                    faceup = (whereKey == Flexagonator.WhereLeaf.Found);
                    break;
                }
            }
            if (whichpat != -1) {
                return { whichpat: whichpat, faceup: faceup };
            }
            // key wasn't found, so find the min value instead
            let minId = Number.MAX_SAFE_INTEGER;
            for (let i = 0; i < patcount; i++) {
                const thisMin = flexagon.pats[i].findMinId();
                if (thisMin < minId) {
                    minId = thisMin;
                }
            }
            return this.findKey(flexagon, minId);
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // unfold a flexagon into a strip of leaves containing information
    // on how to fold it back into the original flexagon
    // optional: for every top-level LeafTree, describe whether to go clockwise
    //    or counterclockwise to get to the next pat
    function unfold(tree, directions) {
        if (typeof (tree) === "number") {
            return { reason: Flexagonator.TreeCode.TooFewPats, context: tree };
        }
        // tracking the next number to assign leaves as they're unfolded
        let next = 3;
        const getNext = () => { return next++; };
        const foldpats = toFoldPats(tree, directions);
        const resultFoldpats = unfoldAll(foldpats, getNext);
        return toLeaves(resultFoldpats);
    }
    Flexagonator.unfold = unfold;
    //----- conversion routines
    function toFoldPats(tree, directions) {
        // note: if !directions, this assumes that all the triangles meet in the middle.
        // if you want to unfold a different arrangement, change the
        //   the direction (isClock) of the appropriate pats by passing in 'directions'
        const foldpats = tree.map((pat) => { return { pat: pat, numbers: [1, 2], isClock: true }; });
        if (!directions || tree.length !== directions.getCount()) {
            return foldpats;
        }
        return foldpats.map((pat, i) => { return Object.assign(Object.assign({}, pat), { isClock: directions.isDown(i) }); });
    }
    function toLeaves(foldpats) {
        const toLeaf = (foldpat) => {
            return { id: Flexagonator.getTop(foldpat.pat), top: foldpat.numbers[0], bottom: foldpat.numbers[1], isClock: foldpat.isClock };
        };
        const leaves = foldpats.map(toLeaf);
        return leaves;
    }
    //----- unfolding routines
    function over(tree) {
        return (Array.isArray(tree)) ? [over(tree[1]), over(tree[0])] : -tree;
    }
    function flip(foldpat) {
        return { pat: over(foldpat.pat), numbers: foldpat.numbers.reverse(), isClock: !foldpat.isClock };
    }
    function unfoldOne(foldpat, getNext) {
        const p1 = foldpat.pat[0];
        const p2 = foldpat.pat[1];
        const n1 = foldpat.numbers[0];
        const n2 = foldpat.numbers[1];
        const next = getNext();
        if (foldpat.isClock) {
            const a = { pat: p2, numbers: [next, n2], isClock: false };
            const b = { pat: over(p1), numbers: [next, n1], isClock: true };
            return [a, b];
        }
        else {
            const a = { pat: p1, numbers: [n1, next], isClock: true };
            const b = { pat: over(p2), numbers: [n2, next], isClock: false };
            return [a, b];
        }
    }
    function flatten(fp) {
        const foldpats = [];
        for (let item of fp) {
            if (Array.isArray(item)) {
                foldpats.push(item[0]);
                foldpats.push(item[1]);
            }
            else {
                foldpats.push(item);
            }
        }
        return foldpats;
    }
    function unfoldAt(foldpats, hinge, getNext) {
        const f = (foldpat, i) => {
            if (i < hinge) {
                return foldpat;
            }
            else if (i === hinge) {
                return unfoldOne(foldpat, getNext);
            }
            else {
                return flip(foldpat);
            }
        };
        const fp = foldpats.map(f);
        return flatten(fp);
    }
    function findNextHinge(foldpats) {
        for (let i in foldpats) {
            if (Array.isArray(foldpats[i].pat)) {
                return Number.parseInt(i);
            }
        }
        return null;
    }
    function unfoldAll(foldpats, getNext) {
        let hinge = findNextHinge(foldpats);
        while (hinge !== null) {
            foldpats = unfoldAt(foldpats, hinge, getNext);
            hinge = findNextHinge(foldpats);
        }
        return foldpats;
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    // starts with the box that we're drawing into,
    // and evaluates new boxes to see if they fill the original box
    // better than others we've seen so far
    class BestBoxInBox {
        constructor(extents) {
            this.ratio = extents.x / extents.y;
            this.bestfit = 0;
        }
        isBest(p0, p1) {
            const thisratio = Math.abs(p1.x - p0.x) / Math.abs(p1.y - p0.y);
            const thisfit = (thisratio < this.ratio) ? thisratio / this.ratio : this.ratio / thisratio;
            if (thisfit <= this.bestfit) {
                return false;
            }
            this.bestfit = thisfit;
            return true;
        }
    }
    Flexagonator.BestBoxInBox = BestBoxInBox;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * compute a common scale that works for every slice.
     * check every slice for its rotation (either explicit or computed) & scale,
     * and pick the best scale to use for every slice
     */
    function computeAcrossSlices(leaflines, sliceIn) {
        let bestScale = 0;
        const rotations = [];
        for (const slice of sliceIn) {
            let leaflinesSubset = Flexagonator.sliceLeafLines(leaflines, slice.start, slice.end);
            // figure out best rotation if not already set
            let rotation = slice.rotation;
            if (rotation !== undefined) {
                leaflinesSubset = Flexagonator.rotateLeafLines(leaflinesSubset, Flexagonator.toRadians(rotation));
            }
            else {
                [leaflinesSubset, rotation] = findBestRotation(leaflinesSubset, { x: slice.width, y: slice.height });
            }
            rotations.push(rotation);
            // figure out row to scale slice to fit
            const [inputMin, inputMax] = Flexagonator.getExtents(leaflinesSubset);
            const scalex = slice.width / (inputMax.x - inputMin.x);
            const scaley = slice.height / (inputMax.y - inputMin.y);
            const scale = Math.min(scalex, scaley);
            if (bestScale === 0 || scale < bestScale) {
                bestScale = scale;
            }
        }
        const results = rotations.map(r => { return { scale: bestScale, rotation: r }; });
        return bestScale === 0 ? [] : results;
    }
    Flexagonator.computeAcrossSlices = computeAcrossSlices;
    // search for the rotation that optimizes the amount of 'box' that gets filled
    function findBestRotation(leaflines, box) {
        let bestlines = leaflines;
        let bestRotation = 0;
        const best = new Flexagonator.BestBoxInBox(box);
        for (let i = 0; i < 24; i++) {
            const rotation = (i * Math.PI * 2) / 24;
            const thislines = Flexagonator.rotateLeafLines(leaflines, rotation);
            const extents = Flexagonator.getExtents(thislines);
            if (best.isBest(extents[0], extents[1])) {
                bestlines = thislines;
                bestRotation = rotation;
            }
        }
        return [bestlines, bestRotation];
    }
    Flexagonator.findBestRotation = findBestRotation;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /** given a=(0,0), b(1,0), angle1=(c,a,b), angle2=(a,b,c), find c */
    function computeTrianglePoint(angle1, angle2) {
        const cota = Math.cos(angle1) / Math.sin(angle1);
        const cotb = Math.cos(angle2) / Math.sin(angle2);
        return { x: cota / (cota + cotb), y: 1 / (cota + cotb) };
    }
    Flexagonator.computeTrianglePoint = computeTrianglePoint;
    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
    Flexagonator.toRadians = toRadians;
    /** mirror p over the line (p1, p2) */
    function mirror(p1, p2, p) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dx2 = dx * dx;
        const dy2 = dy * dy;
        const a = (dx2 - dy2) / (dx2 + dy2);
        const b = 2 * dx * dy / (dx2 + dy2);
        const x2 = a * (p.x - p1.x) + b * (p.y - p1.y) + p1.x;
        const y2 = b * (p.x - p1.x) - a * (p.y - p1.y) + p1.y;
        return { x: x2, y: y2 };
    }
    Flexagonator.mirror = mirror;
    /** get the incenter of a triangle */
    function getIncenter(p1, p2, p3) {
        const a = lengthOf(p2, p3);
        const b = lengthOf(p1, p3);
        const c = lengthOf(p1, p2);
        const x = (a * p1.x + b * p2.x + c * p3.x) / (a + b + c);
        const y = (a * p1.y + b * p2.y + c * p3.y) / (a + b + c);
        return { x: x, y: y };
    }
    Flexagonator.getIncenter = getIncenter;
    function lengthOf(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    Flexagonator.lengthOf = lengthOf;
    function addPoints(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    }
    Flexagonator.addPoints = addPoints;
    function pointsAreEqual(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    Flexagonator.pointsAreEqual = pointsAreEqual;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /*
      Convert an unfolded description of leaves to a set of lines describing
      how to draw the unfolded strip.
        leafs:  description of leaves & how they're connected
        angle1: one angle of triangle for the leaf
        angle2: the edge connecting the angles is the first edge to mirror across
    */
    function leafsToLines(leafs, angle1, angle2) {
        const faces = [];
        const folds = [];
        const cuts = [];
        // first triangle
        let a = { x: 0, y: 0 };
        let b = { x: 1, y: 0 };
        let c = Flexagonator.computeTrianglePoint(angle1, angle2);
        faces.push({ leaf: leafs[0], corners: [a, b, c] });
        if (leafs[0].isClock) {
            folds.push({ a: b, b: c });
            cuts.push({ a: a, b: c });
        }
        else {
            folds.push({ a: a, b: c });
            cuts.push({ a: b, b: c });
        }
        folds.push({ a: a, b: b });
        // keep mirroring a corner based on the direction the strip winds
        for (let i = 1; i < leafs.length; i++) {
            c = Flexagonator.mirror(a, b, c);
            faces.push({ leaf: leafs[i], corners: [a, b, c] });
            if (leafs[i].isClock) {
                folds.push({ a: b, b: c });
                cuts.push({ a: a, b: c });
                const temp = a;
                a = c;
                c = temp;
            }
            else {
                folds.push({ a: a, b: c });
                cuts.push({ a: b, b: c });
                const temp = b;
                b = c;
                c = temp;
            }
        }
        return { faces: faces, folds: folds, cuts: cuts };
    }
    Flexagonator.leafsToLines = leafsToLines;
    function getExtents(leaflines) {
        let xmin = 0, ymin = 0, xmax = 0, ymax = 0;
        for (const face of leaflines.faces) {
            for (const point of face.corners) {
                if (point.x < xmin)
                    xmin = point.x;
                if (point.x > xmax)
                    xmax = point.x;
                if (point.y < ymin)
                    ymin = point.y;
                if (point.y > ymax)
                    ymax = point.y;
            }
        }
        return [{ x: xmin, y: ymin }, { x: xmax, y: ymax }];
    }
    Flexagonator.getExtents = getExtents;
    function sliceLeafLines(leaflines, start, end) {
        if (!start && !end) {
            return leaflines;
        }
        // end+1, because we want inclusive, not exclusive
        const theEnd = end ? end + 1 : end;
        // and there's an extra fold, so we want end+2
        const foldEnd = end ? end + 2 : end;
        return {
            faces: leaflines.faces.slice(start, theEnd),
            folds: leaflines.folds.slice(start, foldEnd),
            cuts: leaflines.cuts.slice(start, theEnd),
        };
    }
    Flexagonator.sliceLeafLines = sliceLeafLines;
    // rotate around the origin
    class Rotate {
        constructor(angle) {
            this.cos = Math.cos(angle);
            this.sin = Math.sin(angle);
        }
        point(p) {
            const x = p.x * this.cos - p.y * this.sin;
            const y = p.y * this.cos + p.x * this.sin;
            return { x: x, y: y };
        }
        line(l) {
            return { a: this.point(l.a), b: this.point(l.b) };
        }
    }
    // rotate leaflines around the origin (in radians)
    function rotateLeafLines(leaflines, angle) {
        if (angle === 0) {
            return leaflines;
        }
        const rotate = new Rotate(angle);
        const faces = [];
        for (let oldface of leaflines.faces) {
            const corners = oldface.corners.map(oldcorner => rotate.point(oldcorner));
            faces.push({ leaf: oldface.leaf, corners: corners });
        }
        const folds = leaflines.folds.map(oldfold => rotate.line(oldfold));
        const cuts = leaflines.cuts.map(oldcut => rotate.line(oldcut));
        return { faces: faces, folds: folds, cuts: cuts };
    }
    Flexagonator.rotateLeafLines = rotateLeafLines;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /*
      This describes the polygon that will be displayed to represent
      a flexagon of triangles where all triangles meet in the middle.
      Every leaf is the same (or a mirror image) and can be any
      arbitrary triangle.  However, there's only one possible angle for
      the vertex in the middle that will make for a closed polygon,
      namely (2*pi/number-of-pats-around-the-center), even though the
      actual leaves might have any angle at all.  This means that
      sometimes the central angle will be >360 and won't lie flat,
      and sometimes it'll be <360 and won't open up all the way.
      For the simple 2D on-screen representation, the central angle
      will always be (2pi/n), and we'll scale the other angles
      appropriately.
    */
    class Polygon {
        constructor(numSides, xCenter, yCenter, radius, anglesDegrees, showFront, rotate) {
            this.numSides = numSides;
            this.xCenter = xCenter;
            this.yCenter = yCenter;
            this.radius = radius;
            this.anglesDegrees = anglesDegrees;
            this.showFront = showFront;
            this.rotate = rotate;
        }
        // returns an array of corners [x1, y1, x2, y2...]
        // the bottom side is parallel to the axis
        getCorners() {
            return this.computePoints(this.radius, -0.5);
        }
        getFaceCenters(factor) {
            return this.computePoints(this.radius * factor, 0);
        }
        getLeafTriangles() {
            const triangles = [];
            const corners = this.computePoints(this.radius, -0.5);
            for (let i = 0; i < this.numSides; i++) {
                const j = i == this.numSides - 1 ? 0 : i + 1;
                const triangle = {
                    x1: this.xCenter, y1: this.yCenter,
                    x2: corners[i * 2], y2: corners[i * 2 + 1],
                    x3: corners[j * 2], y3: corners[j * 2 + 1],
                };
                triangles.push(triangle);
            }
            return triangles;
        }
        /** get points in the leaf corners next to where the original center corner now is,
         * (0: center, 1: counterclockwise, 2: clockwise) */
        getCenterMarkers(whichVertex) {
            if (whichVertex === 0) {
                return this.getFaceCenters(0.2);
            }
            // get points in the clockwise corners & counterclockwise corners
            const one = this.computePoints(this.radius * 0.82, -0.4);
            const two = this.computePoints(this.radius * 0.82, 0.4);
            // alternate between the two sets of corners, since each pat is a mirror of the last
            const result = [];
            for (let i = 0; i < one.length / 2; i++) {
                if ((whichVertex === 1 && i % 2 === 0) || (whichVertex === 2 && i % 2 === 1)) {
                    result.push(one[i * 2]);
                    result.push(one[i * 2 + 1]);
                }
                else {
                    result.push(two[i * 2]);
                    result.push(two[i * 2 + 1]);
                }
            }
            return result;
        }
        computePoints(radius, angleFactor) {
            const corners = [];
            if (this.numSides < 3)
                return corners;
            const angles = new Angles(this.numSides, angleFactor, this.showFront, this.rotate);
            const scales = new Scales(this.numSides, this.anglesDegrees, radius, angleFactor);
            for (let i = 0; i < this.numSides; i++) {
                const point = angles.computePoint(i);
                const scale = scales.computeScale(i);
                corners.push(point[0] * scale + this.xCenter);
                corners.push(point[1] * scale + this.yCenter);
            }
            return corners;
        }
    }
    Flexagonator.Polygon = Polygon;
    // computes the angles for each point around the polygon
    class Angles {
        constructor(numSides, angleFactor, showFront, rotate) {
            rotate = rotate === undefined ? 0 : Math.PI * rotate / 180;
            this.centerAngle = 2 * Math.PI / numSides;
            // the goal in determining this base angle is to put the current vertex
            // at the top or just to the right of the top (mirrored on the backside)
            // & have the base of a regular polygon at the bottom
            const value = showFront ? 1 : 2;
            const adjust = (Math.floor((numSides + value) / 2) - 1) * this.centerAngle;
            this.offsetAngle = Math.PI / 2 + this.centerAngle * angleFactor - adjust + rotate;
        }
        computePoint(i) {
            const thisAngle = this.centerAngle * i + this.offsetAngle;
            const x = Math.cos(thisAngle);
            const y = Math.sin(thisAngle);
            return [x, y];
        }
    }
    // computes the scales used to place the points somewhere between
    // the polygon center and its edges
    class Scales {
        constructor(numSides, anglesDegrees, radius, angleFactor) {
            this.scales = this.getScales(numSides, anglesDegrees);
            this.radius = radius;
            this.angleFactor = angleFactor;
        }
        computeScale(i) {
            // this is how far from the center to put the corner.
            // if we're in the middle of a face (angleFactor ===0),
            //  we need to adjust for the two edges possibly being different
            if (this.angleFactor === 0) {
                return this.radius * (this.scales[0] + this.scales[1]) / 2;
            }
            else {
                return (i % 2 === 0) ? this.radius * this.scales[0] : this.radius * this.scales[1];
            }
        }
        // Basic approach: pretend the center angle (angles[0]) is (2pi/n),
        // and scale the other two angles to keep their proportions the same.
        // Then we'll scale down the side opposite the smaller angle.
        // Returns the scaling to apply to the two radial sides of the leaf.
        getScales(numSides, anglesDegrees) {
            if (anglesDegrees[0] === 60 && anglesDegrees[1] === 60) {
                return [1, 1];
            }
            const theta = 2 * Math.PI / numSides;
            const beta = Flexagonator.toRadians(anglesDegrees[1]);
            const gamma = Flexagonator.toRadians(anglesDegrees[2]);
            const angleScale = (Math.PI - theta) / (beta + gamma);
            const lengthScale = Math.sin(angleScale * gamma) / Math.sin(angleScale * beta);
            if (beta > gamma) {
                return [1, lengthScale];
            }
            return [1 / lengthScale, 1];
        }
    }
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    /**
     * spin the given set of points around the center
     * @param points points to rotate, where (1,0), (1,90), (1,180), (1,270) are midpoints of the bounding box
     */
    function spin(count, center, width, points) {
        const results = [];
        const delta = 2 * Math.PI / count;
        for (let i = 0, angle = 0; i < count; i++, angle += delta) {
            const newPoints = [];
            for (const polar of points) {
                const newR = polar.r * width / 2;
                const newθ = Flexagonator.toRadians(polar.θ) + angle;
                const newOffset = { x: newR * Math.cos(newθ), y: newR * Math.sin(newθ) };
                const newPoint = Flexagonator.addPoints(center, newOffset);
                newPoints.push(newPoint);
            }
            results.push(newPoints);
        }
        return results;
    }
    Flexagonator.spin = spin;
})(Flexagonator || (Flexagonator = {}));
var Flexagonator;
(function (Flexagonator) {
    class Transform {
        constructor(offset, // offset before scale, in input coordinates
        scale, xmax, ymax, offsetPx) {
            this.offset = offset;
            this.scale = scale;
            this.xmax = xmax;
            this.ymax = ymax;
            this.offsetPx = offsetPx;
        }
        static make(outputSize, inputMin, inputMax, flip, scale, insetPx, center) {
            const offset = getOffset(outputSize, inputMin, inputMax, center);
            if (insetPx) { // inset all 4 sides by insetPx pixels
                outputSize = { x: outputSize.x - 2 * insetPx, y: outputSize.y - 2 * insetPx };
            }
            if (!scale) {
                const scalex = outputSize.x / (inputMax.x - inputMin.x);
                const scaley = outputSize.y / (inputMax.y - inputMin.y);
                scale = Math.min(scalex, scaley);
            }
            const xmax = flip === 'x' ? outputSize.x : 0;
            const ymax = flip === 'y' ? outputSize.y : 0;
            return new Transform(offset, scale, xmax, ymax, insetPx ? insetPx : 0);
        }
        apply(point) {
            const p = { x: (point.x + this.offset.x) * this.scale, y: (point.y + this.offset.y) * this.scale };
            const x = this.xmax === 0 ? p.x : this.xmax - p.x;
            const y = this.ymax === 0 ? p.y : this.ymax - p.y;
            return { x: x + this.offsetPx, y: y + this.offsetPx };
        }
        applyScale(len) {
            return this.scale * len;
        }
    }
    Flexagonator.Transform = Transform;
    /** get offset necessary so that inputMin maps to (0,0), or so the input center maps to the output center */
    function getOffset(outputSize, inputMin, inputMax, center) {
        if (center !== true || inputMax.x === inputMin.x || inputMax.y === inputMin.y || outputSize.x === 0 || outputSize.y === 0) {
            return { x: -inputMin.x, y: -inputMin.y };
        }
        const outAspect = outputSize.x / outputSize.y;
        const inAspect = (inputMax.x - inputMin.x) / (inputMax.y - inputMin.y);
        let xOff = 0, yOff = 0;
        if (inAspect < outAspect) {
            // center x
            const inSize = inputMax.x - inputMin.x;
            const inFullSize = inSize * outAspect / inAspect;
            xOff = (inFullSize - inSize) / 2;
        }
        else {
            // center y
            const inSize = inputMax.y - inputMin.y;
            const inFullSize = inSize * inAspect / outAspect;
            yOff = (inFullSize - inSize) / 2;
        }
        return { x: xOff - inputMin.x, y: yOff - inputMin.y };
    }
})(Flexagonator || (Flexagonator = {}));
//# sourceMappingURL=out.js.map