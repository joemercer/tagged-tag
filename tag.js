var TIMETOTAG = 30; // seconds
var DECREMENTVALUE = 1; // seconds

Players = new Meteor.Collection('players');
Tags = new Meteor.Collection('tags');

ArchivedTags = new Meteor.Collection('archivedTags');

if (Meteor.isClient) {

  Template.login.loggedInUser = function() {
    return Session.get('loggedInUser');
  };
  Template.login.score = function() {
    var username = Session.get('loggedInUser');
    var player = Players.findOne({username:username});
    if (player) {
      return player.score
    }
    return 0;
  };

  Template.login.loggedIn = function() {
    return !!Session.get('loggedInUser');
  };

  Template.main.loggedIn = function() {
    return !!Session.get('loggedInUser');
  };

  Template.login.options = function () {
    return Players.find({open:true});
  };

  Template.login_option.events({
    'click img' : function (e) {
      var $target = $(e.target);
      var username = $target.parents('.login_option').data('username');
      var player = Players.findOne({username:username});
      player.open = false;
      player.score = 0;
      Players.update({_id:player._id}, player);
      Session.set('loggedInUser', username);
    }
  });

  Template.active_players.players = function() {
    var username = Session.get('loggedInUser');
    return Players.find({username: {$ne:username}});
  };

  Template.active_player.tags = function() {
    var player = Session.get('loggedInUser');
    return Tags.find({owner:player, active:true});
  };

  Template.active_player.imageUrl = function () {
    return 'http://www.tagged.com/imgsrv.php?sz=1&uid=';
  };

  Template.active_player.events({
    'click #newTag': function(e){
      e.preventDefault();
      e.stopPropagation();
    },
    'click #newTag input': function(e){
      $(e.target).val('');
    },
    'click #newTag button': function(e){
      var $target = $(e.target);
      var value = $target.parent().find('input').val();
      if (value === '') return;

      var recipientUsername = $target.parents('.active-player').data('username');
      var recipient = Players.findOne({username:recipientUsername});

      var d = new Date();

      var existingTag = Tags.findOne({value:value});

      if (existingTag) {
        if (existingTag.active) return;
        
        // reactivate tag
        existingTag.active = true;
        existingTag.owner = recipientUsername;
        existingTag.timeRemaining = TIMETOTAG; //seconds
        existingTag.count = 0;
        existingTag.startTime = d.getTime();

        Tags.update({_id:existingTag._id}, existingTag);
      }
      else {

        // add a new tag
        var newTag = {
          value: value,
          owner: recipientUsername,
          active: true,
          timeRemaining:TIMETOTAG, //seconds
          count: 0,
          startTime: d.getTime()
        };

        Tags.insert(newTag);
      }

      // Add the tag to the recipients tags list for tag_breakdown
      recipient.tags.push(value);
      Players.update({_id:recipient._id}, recipient);

      //reset text
      $target.parent().find('input').val('New tag');
      $target.parents('.tagslist').removeClass('open');
    }
  });

  Template.tag_item.events({
    'click': function (e) {
      var $target = $(e.target);

      var tagValue = $target.parents('.tag').data('tagvalue');
      var tag = Tags.findOne({value:tagValue});

      var recipientUsername = $target.parents('.active-player').data('username');
      var recipient = Players.findOne({username:recipientUsername});

      tag.owner = recipient.username;
      tag.timeRemaining = TIMETOTAG; // seconds
      tag.count = tag.count + 1;
      Tags.update({_id:tag._id}, tag);

      var senderUsername = Session.get('loggedInUser');
      var sender = Players.findOne({username:senderUsername});

      sender.score = sender.score + tag.count;
      Players.update({_id:sender._id}, sender);

      // Add the tag to the recipients tags list for tag_breakdown
      recipient.tags.push(tagValue);
      Players.update({_id:recipient._id}, recipient);
    }
  });


  Template.leaderboard.players = function() {
    return Players.find({}, {sort: {score:-1}});
  };

  Template.leaderboard.tags = function() {
    return Tags.find({}, {sort: {count:-1, value:-1}});
  };

  Template.leaderboard.archivedTags = function() {
    return ArchivedTags.find({}, {sort: {timeLasted:-1}});
  };

  Template.tag_breakdown.tags = function() {
    var username = Session.get('loggedInUser');
    var player = Players.findOne({username:username});
    if (!player) return [];

    var toReturn = [];
    $.each(player.tags, function(ind1, tag) {
      var found = false;
      $.each(toReturn, function(ind2, placed) {
        if (tag === placed.value) {
          placed.count = placed.count + 1;
          found = true;
        }
      });
      if (!found) {
        toReturn.push({
          value: tag,
          count: 1
        });
      }
    });

    return toReturn;
  };

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    if(Players.find().count() == 0) {
      Players.insert({username: "Rushan", open: true, score: 0, tags: [], userId: "5995877324"});
      Players.insert({username: "Nicoeltte", open: true, score: 0, tags: [], userId: "5995985639"});
      Players.insert({username: "Jennelle", open: true, score: 0, tags: [], userId: "5996265657"});
      Players.insert({username: "Joe", open: true, score: 0, tags: [], userId: "5995861086"});
    }
    // if(Tags.find().count() == 0) {
    //   var d = new Date();
    //   Tags.insert({ value: 'Cute', owner:'Red', active: true, timeRemaining:(TIMETOTAG+60), count: 1, startTime: d.getTime()});
    //   Tags.insert({ value: 'Fun', owner:'Green', active: true, timeRemaining:(TIMETOTAG+60-3), count: 1, startTime: d.getTime()});
    //   Tags.insert({ value: 'Silly', owner:'Orange', active: true, timeRemaining:(TIMETOTAG+60-6), count: 0, startTime: d.getTime()});
    //   Tags.insert({ value: 'Awesome', owner:'Blue', active: true, timeRemaining:(TIMETOTAG+60-9), count: 0, startTime: d.getTime()});
    // }

    Meteor.setInterval(function(){
      Tags.find({}).forEach(function(tag){
        if (!tag.active) return;

        tag.timeRemaining = tag.timeRemaining - DECREMENTVALUE;
        if (tag.timeRemaining <= 0){

          // change tag to inactive
          tag.active = false;

          // decrement players score
          var player = Players.findOne({username:tag.owner});
          player.score = player.score - tag.count;
          Players.update({_id:player._id}, player);

          // archive the tag
          var d = new Date();
          tag.timeLasted = Math.round(100*((d.getTime() - tag.startTime)/(1000*60)))/100;
          tag.timeRemaining = -1;
          ArchivedTags.insert(tag);
        }
        Tags.update({_id:tag._id}, tag);
      });
    }, DECREMENTVALUE*1000);
  });
}
