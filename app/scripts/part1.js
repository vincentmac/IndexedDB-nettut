/**
 * scripts/part1.js
 *
 * This is the starting point for your application.
 * Take a look at http://browserify.org/ for more info
 *
 * See http://net.tutsplus.com/tutorials/javascript-ajax/working-with-indexeddb/
 */
/*jshint browser:true */
/*global IDBKeyRange:true */
'use strict';

var App = require('./app.js');

var app = new App();

app.beep();

var idbSupported = false;
var db;

function addPerson(e) {
  console.log(e);
  var name = document.querySelector('#name').value;
  var email = document.querySelector('#email').value;

  console.log('About to add ' + name + '/' + email);

  var transaction = db.transaction(['people'], 'readwrite');
  var store = transaction.objectStore('people');

  //Define a person
  var person = {
    name: name,
    email: email,
    created: new Date()
  };

  //Perform the add
  // var request = store.add(person, 1); // With key of 1
  var request = store.add(person); // with auto key

  request.onerror = function(e) {
    console.log('Error', e.target.error.name);
    //some type of error handler
  };

  request.onsuccess = function(e) {
    console.log('Woot! Did it', e);
  };
}


function getPerson(e) {
  console.log('getPerson', e.target);
  var key = document.getElementById('key').value;

  if (key === '' || isNaN(key)) {
    return;
  }

  var transaction = db.transaction(['people'], 'readonly');
  var store = transaction.objectStore('people');

  var request = store.get(Number(key));

  request.onsuccess = function(e) {

    var result = e.target.result;
    console.dir(result);
    if (result) {
      // var s = '<h2>Key ' + key + '</h2>';
      var s = '<h2>Key ' + key + '</h2><p>';
      for (var field in result) {
        s += field + '=' + result[field] + '<br/>';
      }
      s += '</p>';
      document.getElementById('status').innerHTML = s;
    } else {
      document.getElementById('status').innerHTML = '<h2>No match</h2>';
    }
  };
}

function getAllPeople(e) {
  console.log('getAllPeople', e.target);
  var s = '';
  var transaction = db.transaction(['people'], 'readonly');
  var cursor = transaction.objectStore('people').openCursor();
  cursor.onsuccess = function(e) {
    var person = e.target.result;
    // console.log('target', e.target);
    // console.log('person', person);
    if (person) {
      s += '<h2>Key ' + person.key + '</h2><p>';
      for (var field in person.value) {
        s += field + '=' + person.value[field] + '<br/>';
      }
      s += '</p>';
      person.continue();
    }
    document.querySelector('#allPeople').innerHTML = s;
  };
}

function getPeople(e) {
  console.log('getPeople', e.target);
  var name = document.getElementById('name-search').value;
  var endName = document.getElementById('name-search-end').value;
  
  if (name === '' && endName === '') {
    return;
  }

  var transaction = db.transaction(['people'], 'readonly');
  var store = transaction.objectStore('people');
  var index = store.index('name');

  var range;

  if (name !== '' && endName !== '') {
    range = IDBKeyRange.bound(name, endName);
  } else if (name === '') {
    range = IDBKeyRange.upperBound(endName);
  } else {
    range = IDBKeyRange.lowerBound(name);
  }

  var s = '';

  index.openCursor(range).onsuccess = function(e) {
    var cursor = e.target.result;

    if (cursor) {
      s += '<h2>Key ' + cursor.key + '</h2><p>';
      for (var field in cursor.value) {
        s += field + ' = ' + cursor.value[field] + '<br/>';
      }
      s += '</p>';
      cursor.continue();
    }
    document.getElementById('peopleRange').innerHTML = s;
  };
}


// Initiate App and IndexedDB
document.addEventListener('DOMContentLoaded', function() {
  // var delDB = window.indexedDB.deleteDatabase('idarticle_people');
  if ('indexedDB' in window) {
    idbSupported = true;
  }

  if (idbSupported) {
    var openRequest = window.indexedDB.open('idarticle_people', 1);

    openRequest.onupgradeneeded = function(e) {
      console.log('Upgrading...');
      console.dir(e);

      var thisDB = e.target.result;

      if (!thisDB.objectStoreNames.contains('people')) {
        var objectStore = thisDB.createObjectStore('people', {autoIncrement: true});

        //first arg is name of index, second is the path (col);
        objectStore.createIndex('name', 'name', {unique:false});
        objectStore.createIndex('email', 'email', {unique:true});
      }

      // if (thisDB.objectStoreNames.contains('people')) {
      //   thisDB.deleteObjectStore('people');
      // }

    };

    openRequest.onsuccess = function(e) {
      console.log('Success!');
      db = e.target.result;
      console.log('db', db);

      //Listen for add clicks
      document.getElementById('addButton').addEventListener('click', addPerson, false);
      document.getElementById('getButton').addEventListener('click', getPerson, false);
      document.getElementById('getAllPeople').addEventListener('click', getAllPeople, false);
      document.getElementById('getPeople').addEventListener('click', getPeople, false);
    };

    openRequest.onerror = function(e) {
      console.log('Error');
      console.dir(e);
    };
  }

}, false);


