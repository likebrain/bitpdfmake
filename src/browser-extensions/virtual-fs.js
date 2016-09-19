/* jslint node: true */
'use strict';

// var b64 = require('./base64.js').base64DecToArr;
function VirtualFileSystem() {
	this.fileSystem = {};
	this.baseSystem = {};
}

VirtualFileSystem.prototype.readFileSync = function(filename) {
	filename = fixFilename(filename);

	var base64content = this.baseSystem[filename];
	base64content = base64content || getFontkitData(filename);
	if (base64content) {
		return new Buffer(base64content, 'base64');
	}

	return this.fileSystem[filename];
};

VirtualFileSystem.prototype.writeFileSync = function(filename, content) {
	this.fileSystem[fixFilename(filename)] = content;
};

VirtualFileSystem.prototype.bindFS = function(data) {
	this.baseSystem = data;
};

function fixFilename(filename) {
	if (filename.indexOf(__dirname) === 0) {
		filename = filename.substring(__dirname.length);
	}

	if (filename.indexOf('/') === 0) {
		filename = filename.substring(1);
	}

	return filename;
}

function getFontkitData(filename) {
	if (filename == 'data.trie') {
		return 'AAEQAAAAAAAAADGgAZUBav7t2CtPA0EUBeDZB00pin9AJZIEgyUEj0QhweDAgQOJxCBRBElQSBwSicLgkOAwnNKZ5GaY2c7uzj4o5yZfZrrbefbuIx2nSq3CGmzAWH/+K+UO7MIe7MMhHMMpnMMFXMIVXIt2t3CnP088iPqjqNN8e4Ij7Rle4LUH82rLm6i/92A+RERERERERERNmfz/89GDeRARERERzbN8ceps2Iwt9H0C9/AJ6yOlDkbTczcot5VSm8Pm1vcFWfb7+BKOLTuOd2UlTX4wGP85Eg953lWPFbnuN7PkjtLmalOWbNenkHOSa7T3KmR9MVTZ2zZkVj1kHa68MueVKH0R4zqQ44WEXLM8VjcWHP0PtKLfPzQnMtGn3W4QYf6qxFxceVI394r2xnV+1rih0fV1Vzf3fO1n3evL5J78ruvZ5ptX2Rwy92Tfb1wlEqut3U+sZ3HXOeJ7/zDrbyuP6+Zz0fqa6Nv3vhY7Yu1xWnGevmsvsUpTT/RYIe8waUH/rvHMWKFzLfN8L+rTfp645mfX7ftlnfDtYxN59w0=';
	}
}

module.exports = new VirtualFileSystem();
