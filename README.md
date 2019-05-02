# push-docs
Push documents and files to CouchDB, using the API or command line.

## API
```js
pushdocs(db, dir[, options], callback)
```

* `db` - URL to a CouchDB database. Allows auth URL's.
* `dir` - The directory you wish to upload. See below for details regarding structure.
* `options.ignore` - Ignore file extensions while naming document attachments.
* `options.update` - Update existing documents.
* `options.verbose` - Show verbose logging.

### Example
```js
var pushdocs = require('push-docs');
pushdocs('http://localhost:5984:test', '_docs', (error) => {
	// if (error);
});
```

## CLI
```sh
push-docs [options] <db> [dir]
```

When `dir` is omitted, the current directory will be used.
`options` can be `-i|--ignore`, `-u|--update` or `-v|--verbose`, see above.
Combinations like `-iu` are allowed.

### Example
```sh
push-docs -u http://localhost:5984/test _docs
```

## Tests
Coming soon™...
```sh
npm test
```

## Structure
Currently, only `.json` documents and folders are supported.

Any JSON document will be imported as-is, using the filename as the `_id`.

Any folder will be imported using the foldername as the `_id`. Crude property reading is currently limited to plain text files contained in the folder. A subfolder `_attachments` should contain any files to be added as document attachments.

### Example
```
folder/
- document_1.json
- document_2/
  - _attachments\
    - document.txt
  - document_type
  - document_version
```
will result in the following two documents being pushed:

1.
   ```js
   {
       '_id': 'document_1',
       // ...<any properties read from document_1.json>...
   }
   ```
2.
   ```js
   {
       '_id': 'document_2',
       'document_type': '<contents read from document_type>',
       'document_version': '<contents read from document_version>',
       '_attachments': {
           'document.txt': {
               'content_type': 'text/plain',
               'data': '<base64 encoded data of document.txt>',
           }
       }
   }
   ```
