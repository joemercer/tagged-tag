Players = new Meteor.Collection("players");
Tags = new Meteor.Collection("tags");
Meteor.methods({
  //to user table;
  addTag: function(_tagId, _userId) {
    var player = Players.findOne({userId: _userId});
    var _tags = player.tags;
    _tags.push(_tagId);
    Players.update({userId: _userId}, {$set: {tags: _tags}});
  },
  removeTag: function(_tagId, _userId) {
    var player = Players.findOne({userId : _userId});
    var index = player.tags.indexOf(_tagId);
    console.log('index', index);
    if(index != -1) {
      var _tags = player.tags;
      _tags.splice(index,1);
      Players.update(player._id, {$set: {tags: _tags}});
      console.log('removeTag', Players);
    }
  },
  //to tag table
  add_tag: function(_id, _image) {
    Tags.insert({id: id, count: 0, time:0, image : _image});
  },
  increment_count: function(_id) {
    var oldCount = Tags.findOne({id : _id}).count;
    Tags.update({id: _id}, {$set: {count : oldCount + 1}});
  }, 
  add_player: function(_userId) {
      Players.insert({
          userId: _userId,
          tags: []
      });
  }
});

if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to tag.";
  };

  Template.hello.events({
    'click #login' : function () {
      var _userId = $('#login_name').val();
      var match = Players.findOne({userId:_userId});
      if (!match) {
        Meteor.call("add_player", _userId);
      }
      Session.set('username', _userId);
      Router.setUser(_userId);
    }
  });

  Template.hello.notLoggedIn = function() {
    //if (!Session.get('username')) Session.set('username', null);
    return Session.equals('username', null);
  };

  Template.existingplayers.players = function () {
    return Players.find();
  };

  Template.profile.playerTags = function () {
    console.log(Players);
    var x = Players.findOne({userId : Session.get('username')}).tags;
    return x; 
  };
  Template.profile.isLoggedIn = function() {
    return !Session.equals('username', null);
  };
  Template.profile.loading = false;
  /*
  Template.profile.tags = function() {
    var user = Session.get('username');
    if (user){
      var data = Players.findOne({userId:user});
      if (data) {
        return data.tags;
      }
    }
  }
  */

  Template.profile.events({
    'click #logout' : function () {
      if (Session.get('username')) {
        delete Session.keys['username'];
      }
      Deps.flush(); 
    }
  });

  Template.tag_item.events({
    'click #tag': function (e) {

      var receiver_id = $('#receiver_name').val();
      //console.log($(this).attr("data"));
      var tagId = $(e.target).data('name').toString();
      console.log('receiver_id', receiver_id, tagId);
      //console.log(Session.get('username'));
      //Deps.flush(); // update DOM before focus
      //activateInput(tmpl.find("#edittag-input"));

      Meteor.call('addTag', tagId, receiver_id);
      Meteor.call('removeTag',tagId, Session.get('username'));
      Meteor.call('increment_count', tagId);
    }
  });


  // Url routing using the Backbone Router
  var TagRouter = Backbone.Router.extend({
    routes: {
      ":username": "main"
    },
    main: function (username) {
      var oldUser = Session.get('username');
      if (oldUser !== username) {
        Session.set('username', username);
      }
    },
    setUser: function (username) {
      this.navigate(username, true);
    }
  });

  Router = new TagRouter;

  Meteor.startup(function () {
    Backbone.history.start({pushState: true});
    Session.set('username', null);

    // When adding tag to a todo, ID of the todo
    Session.setDefault('passing_tag', 0);
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    console.log(Players.find().count);
    if(Players.find().count() == 0) {
      Players.insert({userId: "user1", tags : ['1', '2']});
      Players.insert({userId: "user2", tags : ['3']});
      Players.insert({userId: "user3", tags : ['4']});
      Players.insert({userId: "user4", tags : []});
    }
    if(Tags.find().count() == 0) {
      Tags.insert({ id : '1', count: 0, time: 0, image : null});
      Tags.insert({ id : '2', count: 0, time: 0, image : null});
      Tags.insert({ id : '3', count: 0, time: 0, image : null});
      Tags.insert({ id : '4', count: 0, time: 0, image : null});
    }
  });
}
