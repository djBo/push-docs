const fs = require('fs'),
	http = require('http'),
	URL = require('url'),
	fileType = require('file-type');

module.exports = function pushdocs (db, dir, options, callback) {
	db = URL.parse(db);
	if (!isDirectory(dir)) return callback(new Error('Directory ' + dir + ' does not exist'));
	if (typeof options === 'function') {
		callback = options
		options = {}
	}
	options = options || {}

	const ignoreExtensions = options.ignore || false;
	const update = options.update || false;
	const verbose = options.verbose || false;

	performGET(undefined, (status, data, error) => {
		if (error) return callback(error);
		if (status != 200) return callback(new Error('Database does not exist'));
		console.log('Connected to: ' + db.href);
		parseDocuments();
	});

	function detectMimeType(file) {
		const buf = Buffer.alloc(fileType.minimumBytes);
		let fd;
		try {
			fd = fs.openSync(file, 'r');
			fs.readSync(fd, buf, 0, fileType.minimumBytes, 0);
		} finally {
			if (fd) {
				fs.closeSync(fd);
			}
		}
		let type = fileType(buf);
		if (type) {
			return fileType(buf).mime;
		} else {
			if (file.endsWith('.j2c')) {
				return 'image/jpx';
			} else {
				return 'application/octet-stream';
			}
		}
	}

	function isDirectory(path) {
		return fs.existsSync(path) && fs.statSync(path).isDirectory();
	}

	function isFile(path) {
		return fs.existsSync(path) && fs.statSync(path).isFile();
	}

	function parseDocuments() {
		let docs = fs.readdirSync(dir, 'utf8');
		for (var i = 0; i < docs.length; i++) {
			let doc = docs[i];
			let name = dir + '/' + doc;
			if (verbose) console.log('Processing: ' + name);
			let obj;
			if (doc.endsWith('.json')) {
				obj = readJSON(name);
				obj._id = doc.substring(0, doc.length - 5);
			} else if (isDirectory(name)) {
				obj = readDirectory(name);
				obj._id = doc;
			}
			performGET('/' + obj._id, (status, data, error) => {
				if (error) {
					console.error(error);
				} else {
					if (status != 404) {
						if (update) {
							obj._rev = JSON.parse(data)._rev;
						} else {
							if (verbose) console.log("Skipping: " + doc);
							return;
						}
					}
					console.log('Pushing: ' + obj._id);
					performPUT('/' + obj._id, JSON.stringify(obj), (status, data, error) => {
						if (error) {
							console.error(error);
						} else {
							if (status == 201) {
								if (obj._rev) {
									if (verbose) console.log('Updated: ' + doc);
								} else {
									if (verbose) console.log('Uploaded: ' + doc);
								}
							} else {
								console.log(status);
								console.log(data);
							}
						}
					});
				}
			});
		}
	}

	function performGET(url, callback) {
		performHttpRequest(url, 'GET', undefined, callback);
	}

	function performPUT(url, body, callback) {
		performHttpRequest(url, 'PUT', body, callback);
	}

	function performHttpRequest(url, method, body, callback) {
		let data = '';
		const options = {
			protocol: db.protocol,
			hostname: db.hostname,
			port: db.port,
			path: db.path + (url != null ? url : ''),
			auth: db.auth,
			method: method,
			headers: { 'Content-Type': 'application/json' }
		};
		const request = http.request(options, (response) => {
			response.setEncoding('utf8');
			response.on('data', (chunk) => {
				data += chunk;
			});
			response.on('end', () => {
				callback(response.statusCode, data);
			});
		});
		request.on('error', (e) => {
			callback(undefined, undefined, e);
		});
		if (body != null) request.write(body);
		request.end();
	}

	function readAttachment(file) {
		return {
			content_type: detectMimeType(file),
			data: readFile(file).toString('base64')//.substring(0, 63)
		}
	}

	function readAttachments(path) {
		let docs = fs.readdirSync(path, 'utf8');
		let result = {};
		for (var i = 0; i < docs.length; i++) {
			let doc = docs[i];
			let name = path + '/' + doc;
			if (isFile(name)) {
				if (verbose) console.log('Adding attachment: ' + doc);
				if (ignoreExtensions) {
					result[doc.substring(0, doc.lastIndexOf('.'))] = readAttachment(name);
				} else {
					result[doc] = readAttachment(name);
				}
			}
		}
		return result;
	}

	function readDirectory(path) {
		let docs = fs.readdirSync(path, 'utf8');
		let result = {};
		for (var i = 0; i < docs.length; i++) {
			let doc = docs[i];
			let name = path + '/' + doc;
			if (doc === '_attachments' && isDirectory(name)) {
				let obj = readAttachments(name);
				result._attachments = obj;
			} else if (isFile(name)) {
				if (verbose) console.log('Adding property: ' + doc);
				result[doc] = readFile(name).toString();
			}
		}
		return result;
	}

	function readJSON(file) {
		return JSON.parse(readFile(file).toString());
	}

	function readFile(file) {
		return fs.readFileSync(file);
	}
};
