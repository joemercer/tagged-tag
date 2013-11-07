Players = new Meteor.Collection("players");

if (Meteor.isClient) {

  Template.hello.events({
    'click #login' : function () {
      var name = $('#login_name').val();
      var match = Players.findOne({name:name});
      if (!match) {
        Players.insert({
          name: name,
          tags: ['one', 'two']
        });
      }
      Session.set('username', name);
      Router.setUser(name);
    }
  });

  Template.leaderboard.players = function () {
    return Players.find({});
  };

  Template.profile.isLoggedIn = function() {
    return !Session.equals('username', null);
  }
  Template.profile.loading = false;
  Template.profile.tags = function() {
    var user = Session.get('username');
    if (user){
      var data = Players.findOne({name:user});
      if (data) {
        return data.tags;
      }
    }
  }


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
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
