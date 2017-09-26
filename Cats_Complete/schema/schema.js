
const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLID,
    GraphQLList,
    GraphQLFloat,
    GraphQLSchema,
    GraphQLNonNull
} = require('graphql')

const axios = require('axios')


const BreedType = new GraphQLObjectType({
    name: "Breed",
    fields: () => ({
        id: {type: GraphQLID},
        name: {type: GraphQLString},
        description: {type: GraphQLString}
    })
})

const OwnerType = new GraphQLObjectType({
    name: 'Owner', //note that due to circular referencing between the cat and the owner types it is necessary to wrap the definition of the fields object
    //and its return within a function
    //so fields can bea function that returns the fields as opposed to the fields object directly
    //this is hack; something to do with how js closures work (function isnt executed or compiled until the enclosing definitions in the file are all defined)
    fields: ()=>(
        {
            id: {
                type: GraphQLID
            }
        ,
            name: {
                type: GraphQLString
            }
        ,
            cats: {
                //note that we need to instantiate the graph ql list type and provide the listed type directly. not deifning a class.
                type: new GraphQLList(CatType), //need to specify the type of args in the list (similar to anyother generified strictly typed language)
                args: {catId: {type: GraphQLID}},
               resolve(owner, args)
                {
                    return axios.get(`http://localhost:3000/owners/${owner.id}/cats`).then(res => res.data.filter(cat=>!args.catId || args.catId === cat.id))
                }
            }
        }
    )
})

const FoodType = new GraphQLObjectType({
    name: "Food",
    fields: ()=>({
        id: {type: GraphQLID},
        name: {type: GraphQLString},
        price: {type: GraphQLFloat}
    })
})

const CatType = new GraphQLObjectType({
    name: 'Cat',
    fields: ()=> (
        {
            id: {
                type: GraphQLID
            }
        ,
            name: {
                type: GraphQLString
            }
        ,
            breed: {
                type: BreedType,
                  resolve(cat, args){
                    return axios.get(`http://localhost:3000/breeds/${cat.breedId}`).then(res => res.data)
                  }
            }
        ,
            age: {
                type: GraphQLInt
            }
        ,
          acceptedFood: {
            type: FoodType,
            resolve(cat){
                //note: it's fine to have to do multiple http requests to a -different server- that is hosting some data we are using.
              //it just might not be the best example then, for the workshop (since the fetching logic is a little complicated)
              //so maybe just change to the single food type, then show how to write a new root query to fetch all of the application foods.
              return axios.get(`http://localhost:3000/foods/${cat.foodId}/`).then(res => res.data)
            }
          },
            owner: {
                type: OwnerType,
                    //parentValue is just the data that was returned for the containing query.
                    //this data is provided to the resolve functions for each nested value
                    //remember that this function only gets called if a user explicitly requests for the user field of the cat that they want.
                    resolve(cat, args)
                {
                    //the cat that is returned is the cat from the database.
                    //the cat from the database HAS an ownerId.
                    return axios.get(`http://localhost:3000/owners/${cat.ownerId}`).then(res => res.data)
                }
            } //normalized ids change from id to a field defining instance of corresponding type.
            //because the names of the types differ between the model (normalized, cat has a companyId) and the schema we need to
            //write a resolve function to resolve the difference and tell graphQL how to populate this field when it fetches the user.
            //notice that w/o writing a resolve, graphiql just returns null for the owner field.

    })
});


const query = new GraphQLObjectType({
    name: 'Root',
    fields: {
        cats: {
            type: new GraphQLList(CatType),
             resolve(parentValue){
               return axios.get("http://localhost:3000/cats/").then(res=>res.data)
             }
        },
      owners: {
            type: new GraphQLList(OwnerType),
            resolve(){
              return axios.get("http://localhost:3000/owners/").then(res=>res.data)
            }
      },
      foods: {
        type: new GraphQLList(FoodType),
        resolve(){
          return axios.get("http://localhost:3000/foods").then(res=>res.data)
        }
      },
        cat: {
            type: CatType,
            args: {id: {type: GraphQLID}},
            resolve(parentValue, args) {
                return axios.get(`http://localhost:3000/cats/${args.id}`).then(res=>res.data)
            }
        },
        owner: {
            type: OwnerType,
            args: {id: {type: GraphQLID}},
            resolve(parentValue, args){
                //clearly the advantage here is, we only ever need to return
                return axios.get(`http://localhost:3000/owners/${args.id}`).then(res=>res.data)
            }
        }
    }
});

const mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        addCat: {
            type: CatType,
            //all of the arguments are 'optional' (allowed to be null) by default.
            //to mark a field to a mutation endpoint as required, we can wrap it in the 'require not null' graphQL helper
            //recall that we are defining arguments to be submitted to our edit endpoint
            //so we want an ownerId (for our normalized relational table)
            //not the whole owner
            args: {
                //we'll say that the age and ownerId will be optional
                id: {type: new GraphQLNonNull(GraphQLID)},
                age: {type: GraphQLInt},
                name: {type: new GraphQLNonNull(GraphQLString)},
                breed: {type: new GraphQLNonNull(GraphQLString)},
                ownerId: {type: GraphQLString}
            },
            resolve(parentValue, {id, age, name, breed, ownerId}){
                return axios.post("http://localhost:3000/cats/", {
                   id,age,name,breed,ownerId
                }).then(res=>res.data);
            }
        },
        //...hmm... this actually would suit our style of API very well.
        //because instead of havign the client fanangle with generic CRUD style routes we get to invoke
        //nice intuitive domain specifically named routes
        deleteCat: {
            type: CatType,
            args: {id: {type: new GraphQLNonNull(GraphQLID)}}, //gotcha: forgetting to mark a required field within the new graph ql non null helper object
            resolve(parentValue, {id}){
                return axios.delete(`http://localhost:3000/cats/${id}`).then(res=>res.data)
            }
        },
        setCatAge: {
            type: CatType,
            args: {id: {type: new GraphQLNonNull(GraphQLID)}, age: {type: new GraphQLNonNull(GraphQLInt)}},
            resolve(parentValue, {id, age}){
                return axios.patch(`http://localhost:3000/cats/${id}`, {age}).then(res=>res.data)
            }
        }, //our JSON server would manage updating bidirectional relation bw owners and cats automatically.
        //otherwise may need to do so oneself
        setCatOwner: {
            type: CatType,
            args: {id: {type: new GraphQLNonNull(GraphQLID)}, ownerId: {type: new GraphQLNonNull(GraphQLString)}},
            resolve(parentValue, {id, ownerId}){
                return axios.patch(`http://localhost:3000/cats/${id}`, {ownerId}).then(res=>res.data)
            }
        },
      //deconstruct args
      setAcceptedFood: {
            type: CatType,
            args: {id: {type: new GraphQLNonNull(GraphQLID)}, foodId: {type: new GraphQLNonNull(GraphQLID)}},
            resolve(parentValue, {id, foodId}){
              return axios.patch(`http://localhost:3000/cats/${id}`, {foodId}).then(res=>res.data)
            }
      }
    }
})



//a graph ql schema defines endpoints for get and edit type requests
//the two sets of requests make use of different root objects.
//the root query (entry into the graph)
//the root mutation
module.exports = new GraphQLSchema({
    query,
    mutation
})

