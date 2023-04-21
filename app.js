//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// connect to mongoose
mongoose.connect("mongodb://localhost:27017/todolistDB", { useNewUrlParser: true });
// create the schema
const itemsSchema = {
  name: String
};
// Create the model
const Item = mongoose.model("Item", itemsSchema);

// create some documents
const item1 = new Item({ name: "Welcome to your todolist!" });
const item2 = new Item({ name: "Hit the + button to aff a new item." });
const item3 = new Item({ name: "<-- Hit this to delete an item." });

const defaultItems = [item1, item2, item3];

// create schema to hold list of todos
const listSchema = {
  name: String,
  items: [itemsSchema]
}

const List = mongoose.model("List", listSchema);

// get all items and display in page
app.get("/", function (req, res) {

  Item.find().then(function (docs) {
    // check if items is empty, add and load the default items
    if (docs.length === 0) {
      Item.insertMany(defaultItems).then(function (data) {
        console.log("Successfully saved default items to DB.");
      });
      // redirect to the index page
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: docs });
    }
  });
});


// get post request from index.html
app.post("/", function (req, res) {

  // get, create new item and save it
  const item = req.body.newItem;
  // get the listName
  const listName = req.body.list;

  const newItem = Item({ name: item });

  // check and add item to the appropriate list
  if (listName === "Today") {
    newItem.save();
    res.redirect("/");
  } else {
    // find list and add the item to its items
    List.findOne({ name: listName }).then(function (doc) {
      if (doc != null) {
        doc.items.push(newItem);
        doc.save();
        res.redirect("/" + listName);
      }
    });
  }
});


// get post to delete checked item 
app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  // check if item is in today list or any other list
  if (listName == "Today") {
    Item.findByIdAndDelete(checkedItemId).then(function (doc) {
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}).then(function(docs){
      res.redirect("/" + listName);
    });
  }
});


// EJS dynamic routing
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  // check if list is already available or not
  List.findOne({ "name": customListName }).then(function (doc) {
    if (doc == null) {

      // create new list and save
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      list.save();
      res.redirect("/" + customListName);
    } else {
      // show exisiting list
      res.render("list", { listTitle: doc.name, newListItems: doc.items });
    }
  });
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
