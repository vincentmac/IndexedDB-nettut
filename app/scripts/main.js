/**
 * scripts/main.js
 *
 * This is the starting point for your application.
 * Take a look at http://browserify.org/ for more info
 */
/*jshint browser:true */
'use strict';
var _ = require('lodash');
var App = require('./app.js');

// Initiate App and IndexedDB
document.addEventListener('DOMContentLoaded', function() {
  var app = new App('notes', 6);
  app.beep();

  document.getElementById('save-note').addEventListener('click', _.bind(app.saveNote, app), false);
  document.getElementById('add-note').addEventListener('click', _.bind(app.addNote, app), false);
  // document.getElementById('save-note').addEventListener('click', app.saveNote, false);
  document.getElementById('filter').addEventListener('keyup', _.bind(app.filterNotes, app), false);


}, false);


