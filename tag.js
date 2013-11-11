var TIMETOTAG = 30; // seconds
var DECREMENTVALUE = 1; // seconds

var CHECKFORDEADCLIENTSINTERVAL = 90; //seconds
var PINGSERVERINTERVAL = 30; //seconds

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

  Template.login.loggedInUID = function(){
     return Players.findOne({username:Session.get('loggedInUser')}).userId;
  }

  Template.main.loggedIn = function() {
    return !!Session.get('loggedInUser');
  };

  Template.login.options = function () {
    return Players.find({open:true, live:false}, {limit:4});
  };

  Template.login.events({
    'click input': function(e){
      $(e.target).val('');
    },
    'click button.do-login' : function(e) {
      $target = $(e.target);
      var userId = $target.parent().find('#login-id').val();
      var nickname = $target.parent().find('#login-name').val();

      if (userId === '' || nickname === '') return;

      var now = (new Date()).getTime();

      var existing = Players.findOne({userId: userId});
      if (existing) {
        if (existing.live) return;

        existing.live = true;
        existing.open = false;
        existing.last_ping = now;
        Players.update({_id:existing._id}, existing);
      }
      else {
        var newPlayer = {
          userId: userId,
          username: nickname,
          tags: [],
          open: false,
          live: true,
          last_ping: now,
          score: 0
        };

        Players.insert(newPlayer);
      }

      Session.set('loggedInUser', nickname);

      // reset the defaults
      $target.parent().find('#login-id').val('Tagged UserID');
      $target.parent().find('#login-name').val('Nickname');
    }
  });

  Template.login_option.events({
    'click img' : function (e) {
      var $target = $(e.target);
      var username = $target.parents('.login_option').data('username');
      var now = (new Date()).getTime();
      var player = Players.findOne({username:username});
      player.open = false;
      player.live = true;
      player.last_ping = now;
      Players.update({_id:player._id}, player);
      Session.set('loggedInUser', username);
    }
  });

  Template.tag_toast.tags = function() {
    var player = Session.get('loggedInUser');
    return Tags.find({owner:player, active:true});
  };

  Template.tag_toast_item.events({
    'click button': function(e){
      $target = $(e.target);
      var tagValue = $target.parents('.tag-toast-value').data('tagvalue');
      var tag = Tags.findOne({value:tagValue});
      var recipientUsername = tag.lastTaggedBy;
      var recipient = Players.findOne({username:recipientUsername});

      var senderUsername = Session.get('loggedInUser');
      var sender = Players.findOne({username:senderUsername});

      sender.score = sender.score + tag.count;

      tag.active = true;
      tag.owner = recipientUsername;
      tag.lastTaggedBy = senderUsername;
      tag.timeRemaining = TIMETOTAG; //seconds
      tag.count = tag.count+1;

      Tags.update({_id:tag._id}, tag);

      recipient.tags.push(tagValue);
      Players.update({_id:recipient._id}, recipient);

      Players.update({_id:sender._id}, sender);
    }
  });

  var cacheRecipientUsername;
  var cacheTagValue;
  Template.addTagModal.events({
    'click input#addTagPlayer': function(e){
      $target = $(e.target);
      $target.val('');

      var username = Session.get('loggedInUser');
      var player = Players.findOne({username:username});
      var typeaheadSource = [];
      Players.find({live:true, _id: {$ne:player._id}}).forEach(function(player){
        typeaheadSource.push(player.username);
      });
      $target.typeahead({
        source: typeaheadSource
      });
    },
    'click input#addTagTag': function(e){
      $target = $(e.target);
      $target.val('');
    },
    'click button#addNewTag' : function(e) {
      var username = Session.get('loggedInUser');
      var sender = Players.findOne({username:username});

      var recipientUsername = $('input#addTagPlayer').val();
      cacheRecipientUsername = recipientUsername;
      var recipient = Players.findOne({username:recipientUsername, live:true});

      // error handling - can only send tags to other live players
      if (username === recipientUsername) return;
      if (!recipient) return;

      var d = new Date();

      var tagValue = $('input#addTagTag').val();
      cacheTagValue = tagValue;
      var existingTag = Tags.findOne({value:tagValue});

      if (existingTag) {
        $('#addTagModal .modal-body').html('<p> Are you sure? Tagging '+recipientUsername+' as '+tagValue+' will cost 10 points because '+tagValue+' is not a new tag</p>');

        $('#addTagModal .modal-footer').html('<button class="btn closeModal" data-dismiss="modal" aria-hidden="true">Close</button><button id="addNewTagConfirm" class="btn btn-primary">Ok</button>');

        return;
      }

      // add a new tag
      var newTag = {
        value: tagValue,
        owner: recipientUsername,
        lastTaggedBy: username,
        active: true,
        timeRemaining:TIMETOTAG, //seconds
        count: 1,
        startTime: d.getTime()
      };

      Tags.insert(newTag);

      // Add the tag to the recipients tags list for tag_breakdown
      recipient.tags.push(tagValue);
      Players.update({_id:recipient._id}, recipient);

      //reset text
      $('#input#addTagTag').val('Awesome');
      $('input#addTagPlayer').val('Joe');

      $('#addTagModal .modal-footer button.closeModal').click();
    },
    'click button#addNewTagConfirm' : function(e) {
      var username = Session.get('loggedInUser');
      var sender = Players.findOne({username:username});

      var recipient = Players.findOne({username:cacheRecipientUsername});

      var existingTag = Tags.findOne({value:cacheTagValue});

      // update existing tag
      existingTag.active = true;
      existingTag.owner = cacheRecipientUsername;
      existingTag.lastTaggedBy = username;
      existingTag.timeRemaining = TIMETOTAG; //seconds
      existingTag.count = existingTag.count + 1;
      existingTag.startTime = (new Date()).getTime();

      Tags.update({_id:existingTag._id}, existingTag);

      // subtract ten points from the sender
      sender.score = sender.score - 10;
      Players.update({_id:sender._id}, sender);

      // Add the tag to the recipients tags list for tag_breakdown
      recipient.tags.push(cacheTagValue);
      Players.update({_id:recipient._id}, recipient);

      // close the modal
      $('#addTagModal .modal-footer button.closeModal').click();

      //reset text
      $('#addTagModal .modal-body').html('Tag <input id="addTagPlayer" type="text" value="Joe"> as <input id="addTagTag" type="text" value="Awesome"><br><br><br><br><br><br><br>');

      $('#addTagModal .modal-footer').html('<button class="btn closeModal" data-dismiss="modal" aria-hidden="true">Close</button><button id="addNewTag" class="btn btn-primary">Tag</button>');

      $('#input#addTagTag').val('Awesome');
      $('input#addTagPlayer').val('Joe');
    }
  });

  Template.stealTagModal.events({
    'click input#stealTagTag': function(e){
      $target = $(e.target);
      $target.val('');

      var username = Session.get('loggedInUser');
      var player = Players.findOne({username:username});
      var typeaheadSource = [];
      Tags.find({owner: {$ne:player.username}}).forEach(function(tag){
        typeaheadSource.push(tag.value);
      });
      $target.typeahead({
        source: typeaheadSource
      });
    },
    'click button#stealNewTag' : function(e){
      var username = Session.get('loggedInUser');
      var player = Players.findOne({username:username});

      var tagValue = $('#stealTagModal .modal-body #stealTagTag').val();
      var tag = Tags.findOne({value:tagValue});
      if (!tag) return;

      tag.active = true;
      tag.lastTaggedBy = tag.owner;
      tag.owner = username;
      tag.timeRemaining = TIMETOTAG; //seconds
      tag.count = tag.count + 1;

      Tags.update({_id:tag._id}, tag);

      $('#stealTagModal .modal-footer button.closeModal').click();
    }
  });

  Template.active_players.players = function() {
    var username = Session.get('loggedInUser');
    var player = Players.findOne({username:username});
    return Players.find({live:true, _id: {$ne:player._id}});
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
    'click #newTag input' : function(e){
      $(e.target).val('');
    },
    'keyup #newTag input' : function(e) {
      // user presses enter
      if (e.keyCode === 13) {
        $(e.target).parents('#newTag').find('button').click();
      }
    },
    'click #newTag button': function(e){
      var $target = $(e.target);
      var value = $target.parent().find('input').val();
      if (value === '') return;

      var recipientUsername = $target.parents('.active-player').data('username');
      var recipient = Players.findOne({username:recipientUsername});

      var senderUsername = Session.get('loggedInUser');

      var d = new Date();

      var existingTag = Tags.findOne({value:value});
      if (existingTag) {
        if (existingTag.active) return;
        
        // reactivate tag
        existingTag.active = true;
        existingTag.owner = recipientUsername;
        existingTag.lastTaggedBy = senderUsername;
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
          lastTaggedBy:senderUsername,
          active: true,
          timeRemaining:TIMETOTAG, //seconds
          count: 1,
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

      var senderUsername = Session.get('loggedInUser');
      var sender = Players.findOne({username:senderUsername});

      tag.owner = recipient.username;
      tag.lastTaggedBy = senderUsername;
      tag.timeRemaining = TIMETOTAG; // seconds
      tag.count = tag.count + 1;
      Tags.update({_id:tag._id}, tag);

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

  // Ping the server to prove that the client is still alive
  var pingIntervalId = Meteor.setInterval(function(){
    var username = Session.get('loggedInUser');
    var player = Players.findOne({username:username});
    if (player){
      var now = (new Date()).getTime();
      player.last_ping = now;
      Players.update({_id:player._id}, player);
    }
    else {
      Meteor.clearInterval(pingIntervalId);
    }
  }, PINGSERVERINTERVAL*1000);

}

if (Meteor.isServer) {

  Meteor.startup(function () {
    if(Players.find().count() == 0) {
      Players.insert({userId: "5995861086", username: "Joe", open: true, live:false, last_ping:-1, score: 0, tags: []});
      Players.insert({userId: "5995877324", username: "Rushan", open: true, live:false, last_ping:-1, score: 0, tags: []});
      Players.insert({userId: "5995985639", username: "Nicolette", open: true, live:false, last_ping:-1, score: 0, tags: []});
      Players.insert({userId: "5996265657", username: "Jennelle", open: true, live: false, last_ping:-1, score: 0, tags: []});
      Players.insert({userId: "5995496896", username: "Kevin", open: true, live:false, last_ping:-1, score: 0, tags: []});
      Players.insert({userId: "6736003894", username: "Eric Y", open: true, live:false, last_ping:-1, score: 0, tags: []});
      Players.insert({userId: "5453891178", username: "mpark", open: true, live:false, last_ping:-1, score: 0, tags: []});
    
    }
    // if(Tags.find().count() == 0) {
    //   var d = new Date();
    //   Tags.insert({ value: 'Cute', owner:'Joe', active: true, timeRemaining:(TIMETOTAG), count: 1, startTime: d.getTime()});
    //   Tags.insert({ value: 'Fun', owner:'Joe', active: true, timeRemaining:(TIMETOTAG-3), count: 1, startTime: d.getTime()});
    //   Tags.insert({ value: 'Silly', owner:'Joe', active: true, timeRemaining:(TIMETOTAG-6), count: 0, startTime: d.getTime()});
    //   Tags.insert({ value: 'Awesome', owner:'Joe', active: true, timeRemaining:(TIMETOTAG-9), count: 0, startTime: d.getTime()});
    // }

    // Set interval to check for dead clients and reopen them
    Meteor.setInterval(function(){
      var now = (new Date()).getTime();
      Players.find({
        open:false,
        live:true,
        last_ping: {$lt: (now - CHECKFORDEADCLIENTSINTERVAL*1000)}
      }).forEach(function(player){
        player.open = true;
        player.live = false;
        Players.update({_id:player._id}, player);
      });
    }, CHECKFORDEADCLIENTSINTERVAL*1000);



    // !!! this is not very optimized, but it seems to work for
    // up to 1000 tags so probably ok for now.
    // set the time remaining for each tag
    Meteor.setInterval(function(){
      Tags.find({active:true}).forEach(function(tag){
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
          var aTag = ArchivedTags.findOne({_id:tag._id});
          if (!aTag) {
            ArchivedTags.insert(tag);
          }
        }
        Tags.update({_id:tag._id}, tag);
      });
    }, DECREMENTVALUE*1000);
  });
}
