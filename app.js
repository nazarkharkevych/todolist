require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require("lodash");
const date = require(__dirname + "/date.js");
const port = process.env.PORT || 3000;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const day = date.getDate();

//Mongoose

mongoose.connect(process.env.DATABASE_URL);

//Items schema for main list, with default items

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);


const item1 = new Item ({name:"Welcome to your todolist!"});

const item2 = new Item ({name:"Hit the + button to add a new item."});

const item3 = new Item ({name:"<-- Hit this to delete an item."});

const defaultItems = [item1, item2, item3];

//List schema for lists with same names as path

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

//If nothing in Items collection, insert default items.

app.get("/", function(req, res) {

Item.find(function(err, result){
  if (result.length === 0) {
    Item.insertMany(defaultItems, function(err,docs){
      if (err) {
        console.log(err)
      } else {
        console.log("Added default items.")
      }
    });
    res.redirect("/");
  } else {
    res.render("list", {listTitle: day, newListItems: result});
  }
});

});

//Custom get routes will render lists with same names as path, and add default items.

app.get("/:path", (req,res)=>{

    const customPath = _.capitalize(req.params.path)

    List.findOne({name:customPath}, function(err, result){
      if (!err){
        if (!result){
          const list = new List({
            name: customPath,
            items: defaultItems
          })
          list.save();
          res.redirect("/" + customPath);
        } else if (result.items.length === 0) {
          result.items = defaultItems;
          result.save();
          res.render("list", {listTitle: result.name, newListItems: result.items});
        } else {
          res.render("list", {listTitle: result.name, newListItems: result.items});
        }
      } else {
        console.log(err)
      }
    });

});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;
  
  const newItemName = new Item ({name: itemName});

    if (listName === day){              //If posted from default route "/", save item to Item schema
      newItemName.save();
      res.redirect("/");
    } else {                            //If posted from custom route "/:path", save item to List schema
      List.findOne({name: listName}, function(err,foundList){
        foundList.items.push(newItemName);
        foundList.save();
        res.redirect("/" + listName)
      });
    }
  
});

app.post('/delete', (req,res) => {                 //Deletes item when activating the checkbox
  const itemId = req.body.checkbox                 //Checkbox has value of _id of item in mongodb collection
  const hiddenName = req.body.listName             //Hidden element has value of the title of the list
  
    if (hiddenName === day) {
      Item.findByIdAndRemove(itemId, function(err){
        if (err){
          console.log(err)
        } else {
          console.log("Deleted 1 item, id: " + itemId)
          res.redirect('/');
        }
      });
    } else {
      List.findOneAndUpdate({name: hiddenName}, {$pull: {items: {_id: itemId}}}, function(err, foundList){
        if (!err){
          console.log("Deleted 1 item, id: " + itemId)
          res.redirect("/" + hiddenName)
        } else {
          console.log(err)
        }
      })
    }

});

app.listen(port, function() {
  console.log(`Server started on port ${port}`);
});