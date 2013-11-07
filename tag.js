Players = new Meteor.Collection("players");

if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to tag.";
  };

  Template.hello.events({
    'click #login' : function () {
      var name = $('#login_name').val();
      var match = Players.findOne({name:name});
      if (!match) {
        Players.insert({name:name});
      }
    }
  });

  Template.leaderboard.players = function () {
    return Players.find({});
  };
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
