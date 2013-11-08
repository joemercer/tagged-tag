var TIMETOTAG = 300000;
var DECREMENTVALUE = 500;

Players = new Meteor.Collection("players");
Tags = new Meteor.Collection("tags");

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
    console.log('logged in', !!Session.get('loggedInUser'))
    return !!Session.get('loggedInUser');
  };

  Template.main.loggedIn = function() {
    return !!Session.get('loggedInUser');
  };

  Template.login.options = function () {
    return Players.find({open:true});
  };

  Template.login_option.events({
    'click button' : function (e) {
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
      console.log('added tag with value', value);

      var recipientUsername = $target.parents('.active-player').data('username');
      var recipient = Players.findOne({username:recipientUsername});

      var d = new Date();

      if (Tags.find({value:value}).count() !== 0) {
        // notify
        return;
      }

      tag = {
        value: value,
        owner: recipientUsername,
        active: true,
        timeRemaining:TIMETOTAG,
        count: 0,
        startTime: d.getTime()
      };

      Tags.insert(tag);

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
      tag.timeRemaining = TIMETOTAG;
      tag.count = tag.count + 1;
      Tags.update({_id:tag._id}, tag);

      var senderUsername = Session.get('loggedInUser');
      var sender = Players.findOne({username:senderUsername});

      sender.score = sender.score + tag.count;
      Players.update({_id:sender._id}, sender);
    }
  });


  Template.leaderboard.players = function() {
    return Players.find({}, {sort: {score:-1}});
  }

  Template.leaderboard.tags = function() {
    return Tags.find({}, {sort: {count:-1, timeRemaining:-1}});
  }

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    //onsole.log(Players.find().count);
    if(Players.find().count() == 0) {
      Players.insert({username: "Red", open: true, score: 0, userId: "5995877324", name: "Rushan"});
      Players.insert({username: "Green", open: true, score: 0, userId: "5995985639", name: "Nicolette"});
      Players.insert({username: "Blue", open: true, score: 0, userId: "5996265657", name: "Jennelle"});
      Players.insert({username: "Orange", open: true, score: 0, userId: "5995861086", name: "Joe"});
    }
    if(Tags.find().count() == 0) {
      var d = new Date();
      Tags.insert({ value: 'Cute', owner:'Red', active: true, timeRemaining:TIMETOTAG, count: 1, startTime: d.getTime()});
      Tags.insert({ value: 'Fun', owner:'Green', active: true, timeRemaining:TIMETOTAG-1000, count: 1, startTime: d.getTime()});
      Tags.insert({ value: 'Silly', owner:'Orange', active: true, timeRemaining:TIMETOTAG-2000, count: 0, startTime: d.getTime()});
      Tags.insert({ value: 'Awesome', owner:'Blue', active: true, timeRemaining:TIMETOTAG-3000, count: 0, startTime: d.getTime()});
    }

    Meteor.setInterval(function(){
      Tags.find({}).forEach(function(tag){
        if (!tag.active) return;

        tag.timeRemaining = tag.timeRemaining - DECREMENTVALUE;
        if (tag.timeRemaining <= 0){
          tag.active = false;

          var player = Players.findOne({username:tag.owner});
          player.score = player.score - tag.count;
          Players.update({_id:player._id}, player);
        }
        Tags.update({_id:tag._id}, tag);
      });
    }, DECREMENTVALUE);
  });
}
