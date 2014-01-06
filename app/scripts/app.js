/**
 * scripts/app.js
 *
 * This is a sample CommonJS module.
 * Take a look at http://browserify.org/ for more info
 */
/*jshint browser:true */
'use strict';

var _ = require('lodash');

function App(name, version) {
  console.log('app initialized');
  this.db = '';  // IDBDatabase Object
  this.docFrag = null;
  this.detail = document.getElementById('note-detail');
  this.form = document.getElementById('note-form');
  if (this.verifyIndexedDB()) {
    console.log('verified IndexDB');
    this.openDB(name, version);
  }
}

module.exports = App;

function _dtFormat(input) {
  if (!input) {
    return '';
  }
  var res = (input.getMonth() + 1) + '/' + input.getDate() + '/' + input.getFullYear() + ' ';
  var hour = input.getHours();
  var ampm = 'AM';
  if (hour === 12) {
    ampm = 'PM';
  }
  if (hour > 12) {
    hour -= 12;
    ampm = 'PM';
  }
  var minute = input.getMinutes() + 1;
  if (minute < 10) {
    minute = '0' + minute;
  }
  res += hour + ':' + minute + ' ' + ampm;
  return res;
}

App.prototype.beep = function () {
  console.log('boop');
};

App.prototype.verifyIndexedDB = function() {
  if (!('indexedDB' in window)) {
    console.log('IndexedDB support required for this demo!');
    return false;
  }
  return true;
};

App.prototype.openDB = function(name, version) {
  var that = this;
  // Attempt connection to IndexedDB
  var req = window.indexedDB.open(name, version);

  req.onerror = function(e) {
    console.log('Error opening db');
    console.dir(e);
  };

  req.onupgradeneeded = function(e) {
    console.log('upgrade needed');
    that.db = e.target.result;
    
    if (!that.db.objectStoreNames.contains('note')) {
      console.log('Need to make the note object store');
      that.store = that.db.createObjectStore('note', {
        keyPath: 'id',
        autoIncrement: true
      });
      // that.store.createIndex('title', 'title', {unique: false});
      if (!that.store.indexNames.contains('titlelc')) {
        that.store.createIndex('titlelc', 'titlelc', {unique: false});
      }
      if (!that.store.indexNames.contains('tags')) {
        that.store.createIndex('tags', 'tags', {unique: false, multiEntry: true});
      }
    }

    if (!that.store) {
      // See: http://blogs.microsoft.co.il/gilf/2012/02/23/updating-an-existing-indexeddb-objectstore/
      var store = e.currentTarget.transaction.objectStore('note');
      // store.createIndex('title', 'title', {unique: false});
      if (!store.indexNames.contains('titlelc')) {
        store.createIndex('titlelc', 'titlelc', {unique: false});
      }
      if (!store.indexNames.contains('tags')) {
        store.createIndex('tags', 'tags', {unique: false, multiEntry: true});
        console.log('upgraded index to use tags');
      }
    }


  };

  req.onsuccess = function(e) {
    that.db = e.target.result;

    that.db.onerror = function(evt) {
      console.log('Database error:', evt.target.errorCode);
      console.dir(evt.target);
    };

    that.displayNotes();
    that.countNotes();
  };
};

App.prototype.displayNotes = function displayNotes(filter) {
  // console.log('displayNotes filter', filter);
  var that = this;
  var transaction = this.db.transaction(['note'], 'readonly');
  this.docFrag = null;
  this.docFrag = document.createDocumentFragment();
  var table = document.createElement('table');
  table.width = '100%';
  // var content = '<table width="100%"><thead><tr><th width="200">Title</th><th width="200">Updated</th><th width="200">&nbsp;</td></thead><tbody>';
  var content = '<thead><tr><th width="400">Title</th><th width="150">Updated</th><th width="100">&nbsp;</td></thead><tbody>';

  transaction.oncomplete = function() {
    // console.log('oncomplete', e);
    var list = document.getElementById('note-list');
    that._registerEvents();

    list.innerHTML = '';
    list.appendChild(that.docFrag);
  };

  var handleResult = function(e) {
    var cursor = e.target.result;

    if (cursor) {
      content += '<tr data-key="' + cursor.key + '"><td class="notetitle">' + cursor.value.title + '</td>';
      content += '<td>' + _dtFormat(cursor.value.updated) + '</td>';
      content += '<td><button class="edit tiny">Edit</button> <button class="delete tiny alert">Delete</button></td>';
      content += '</tr>';

      cursor.continue ();
    } else {
      // console.log('close table');
      // content += '</tbody></table>';
      content += '</tbody>';
      table.innerHTML = content;
      // console.log('table', table);
      that.docFrag.appendChild(table);
    }
  };

  var store = transaction.objectStore('note');

  if (filter) {
    filter = filter.toLowerCase();
    // See: http://stackoverflow.com/a/8961462/52160
    var range = IDBKeyRange.bound(filter, filter + '\uffff');
    var index = store.index('titlelc');
    index.openCursor(range).onsuccess = handleResult;
  } else {
    store.openCursor().onsuccess = handleResult;
  }

};

App.prototype.addNote = function() {
  this._clearForm();
  this._showForm();
  this._hideDetail();
};


App.prototype.saveNote = function() {
  // console.log('save note', e);
  var that = this;
  var title = document.getElementById('title').value;
  var titlelc = document.getElementById('title').value.toLowerCase();
  var body = document.getElementById('body').value;
  var key = document.getElementById('key').value;
  var tagString = document.getElementById('tags').value;
  var tags = [];

  var t = this.db.transaction(['note'], 'readwrite');

  // Convert tag string to array if present
  if (tagString.length) {
    // tags = tagString.split(',');
    tags = _.map(tagString.split(','), function(tag) {
      return tag.trim();
    });
  }

  if (key === '') {
    t.objectStore('note').add({
      title: title,
      titlelc: titlelc,
      body: body,
      updated: new Date(),
      tags: tags
    });
  } else {
    t.objectStore('note').put({
      title: title,
      titlelc: titlelc,
      body: body,
      updated: new Date(),
      id: Number(key),
      tags: tags
    });
  }

  t.oncomplete = function(){
    that._clearForm();
    that.displayNotes();
    that.countNotes();
    that._hideForm();
  };

  // return false;
};

App.prototype.editNote = function(e) {
  var that = this;
  // console.log('edit note:', e.target.parentNode.parentNode);
  e.stopPropagation();
  var id = e.target.parentNode.parentNode.getAttribute('data-key');
  // console.log('edit note key:', id);
  var t = that.db.transaction(['note'], 'readwrite');
  var request = t.objectStore('note').get(Number(id));
  
  request.onsuccess = function() {
    var note = request.result;
    // console.log('note:', note, e);
    document.getElementById('key').value = note.id;
    document.getElementById('title').value = note.title;
    document.getElementById('body').value = note.body;
    document.getElementById('tags').value = note.tags.join(',');
    that._showForm();
    that._hideDetail();
  };
};

App.prototype.deleteNote = function(e) {
  // console.log('delete note:', e);
  var that = this;
  e.stopPropagation();
  var id = e.target.parentNode.parentNode.getAttribute('data-key');

  var t = that.db.transaction(['note'], 'readwrite');
  // var request = t.objectStore('note').delete(Number(id));
  t.objectStore('note').delete(Number(id));

  t.oncomplete = function() {
    that.displayNotes();
    that.countNotes();
    that._hideDetail();
    that._hideForm();
  };
};

// App.prototype.showNote = function(e) {
App.prototype.showNote = function(id) {
  // console.log('show note:', e);
  // console.log('show note:', id);
  // e.stopPropagation();
  var that = this;
  this.docFrag = null;
  this.docFrag = document.createDocumentFragment();
  var noteItem = document.createElement('article');
  // var id = e.target.parentNode.getAttribute('data-key');
  // console.log('show note key:', id, e.target);
  // console.log('show note key:', id);

  var transaction = this.db.transaction(['note']);
  var request = transaction.objectStore('note').get(Number(id));

  transaction.oncomplete = function() {
    // console.log('showNote oncomplete', e);
    that.detail.innerHTML = '';
    that.detail.appendChild(that.docFrag);
    that._hideForm();
    that._showDetail();
  };

  request.onsuccess = function() {
    var note = request.result;
    var content = '<h2>' + note.title +'</h2>';
    if (note.tags && note.tags.length) {
      content += '<strong>Tags:</strong> ';
      note.tags.forEach(function(val) {
        content += '<a class="tag" title="Click for Related Notes" data-noteid="' + note.id + '">' + val + '</a> ';
      });
      content += '<br/><div id="related-notes"></div>';
    }
    content += '<p>' + note.body + '</p>';
    // that.detail.innerHTML = content;
    // console.log('note content', content);
    
    noteItem.innerHTML = content;
    that.docFrag.appendChild(noteItem);

    if (note.tags && note.tags.length) {
      that._registerTags();
    }
  };
};

App.prototype.filterNotes = function(e) {
  // console.log('filter notes', e.target);
  // console.log('filter notes', e.target.value);
  this.displayNotes(e.target.value);
};

App.prototype.countNotes = function() {
  // console.log('count notes', this.form);
  this.db.transaction(['note'], 'readonly').objectStore('note').count().onsuccess = function(e) {
    document.getElementById('note-count').textContent = ' (' + e.target.result + ' Notes Total)';
  };
};

App.prototype.tagLookup = function(e) {
  var that = this;
  var tag = e.target.text;
  var id = e.target.getAttribute('data-noteid');
  // console.log('tagLookup', tag, 'id', id);

  this.docFrag = null;
  this.docFrag = document.createDocumentFragment();
  var notes = document.createElement('div');

  var doneOne = false;
  var content = '<p><strong>Related Notes:</strong><br/>';

  var transaction = this.db.transaction(['note'], 'readonly');
  var store = transaction.objectStore('note');
  var tagIndex = store.index('tags');
  var range = IDBKeyRange.only(tag);

  transaction.oncomplete = function() {
    // console.log('oncomplete', e);
    var related = document.getElementById('related-notes');
    if (!doneOne) {
      content += 'No other notes with this tag.';
    }
    content += '</p>';
    notes.innerHTML = content;
    that.docFrag.appendChild(notes);
    that._registerRelatedNotes();
    related.innerHTML = '';
    related.appendChild(that.docFrag);
  };

  var handleResult = function handleResult(e) {
    var cursor = e.target.result;

    if (cursor) {
      // console.log('tagLookup id:', cursor.value.id);
      if (cursor.value.id !== id) {
        doneOne = true;
        content += '<a class="load-note" data-noteid="' + cursor.value.id + '">' + cursor.value.title + '</a><br/>';
      }
      cursor.continue();
    }
  };

  tagIndex.openCursor(range).onsuccess = handleResult;
};

App.prototype._registerEvents = function() {
  var that = this;

  // register clicks on row
  var deletes = this.docFrag.querySelectorAll('.delete');
  var edits = this.docFrag.querySelectorAll('.edit');
  // var tds = this.docFrag.querySelectorAll('td');
  var tbody = this.docFrag.querySelector('tbody');
  var trs = tbody.querySelectorAll('tr');
  // console.log('deletes', deletes);
  // console.log('edits', edits);
  // console.log('tds', tds);

  // console.log('register events');
  _.each(deletes, function registerDelete(button) {
    button.addEventListener('click', _.bind(that.deleteNote, that), false);
  });

  _.each(edits, function registerDelete(button) {
    button.addEventListener('click', _.bind(that.editNote, that), false);
  });

  _.each(trs, function registerDelete(tr) {
    // td.addEventListener('click', _.bind(that.showNote, that), false);
    var id = tr.getAttribute('data-key');
    // console.log('id:', id);
    tr.addEventListener('click', _.bind(function() {that.showNote(id);}, that), false);
  });
};

App.prototype._registerTags = function() {
  // console.log('register tags');
  var that = this;
  var tags = this.docFrag.querySelectorAll('.tag');

  // console.log('tags elements:', tags);
  _.each(tags, function registerTag(tag) {
    tag.addEventListener('click', _.bind(that.tagLookup, that), false);
  });
};

App.prototype._registerRelatedNotes = function() {
  // console.log('register related notes');
  var that = this;
  var notes = this.docFrag.querySelectorAll('.load-note');

  // console.log('related notes elements:', notes);
  _.each(notes, function registerTag(note) {
    var id = note.getAttribute('data-noteid');
    note.addEventListener('click', _.bind(function() {that.showNote(id);}, that), false);
  });
};

App.prototype._clearForm = function() {
  // console.log('clear form');
  // clear form details
  document.getElementById('key').value = '';
  document.getElementById('title').value = '';
  document.getElementById('body').value = '';
};

App.prototype._showForm = function() {
  // console.log('show form', this.form);
  this.form.className = 'active';
};

App.prototype._hideForm = function() {
  // console.log('hide form', this.form);
  this.form.className = '';
};

App.prototype._showDetail = function() {
  // console.log('show detail', this.detail);
  this.detail.className = 'active';
};

App.prototype._hideDetail = function() {
  // console.log('hide detail', this.detail);
  this.detail.className = '';
};








