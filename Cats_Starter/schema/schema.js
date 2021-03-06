/*

general note there are alternative graph ql clients, such as apollo. they differ from the express client in that you end up defining the graph ql types and
resolver runcvtions in separate files



 */



const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLList,
    GraphQLSchema,
    GraphQLNonNull
} = require('graphql')

const axios = require('axios')


const OwnerType = new GraphQLObjectType({
    name: 'Owner', //note that due to circular referencing between the cat and the owner types it is necessary to wrap the definition of the fields object
    //and its return within a function
    //so fields can bea function that returns the fields as opposed to the fields object directly
    //this is hack; something to do with how js closures work (function isnt executed or compiled until the enclosing definitions in the file are all defined)
    fields: ()=>(
        {
            id: {
                type: GraphQLString
            }
        ,
            name: {
                type: GraphQLString
            }
        ,
            cats: {
                //note that we need to instantiate the graph ql list type and provide the listed type directly. not deifning a class.
                type: new GraphQLList(CatType), //need to specify the type of args in the list (similar to anyother generified strictly typed language)
                resolve(owner)
                {
                    return axios.get(`http://localhost:3000/owners/${owner.id}/cats`).then(res => res.data)
                }
            }
        }
    )
})

const CatType = new GraphQLObjectType({
    name: 'Cat',
    fields: ()=> (
        {
            id: {
                type: GraphQLString
            }
        ,
            name: {
                type: GraphQLString
            }
        ,
            breed: {
                type: GraphQLString
            }
        ,
            age: {
                type: GraphQLInt
            }
        ,
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
        cat: {
            type: CatType,
            args: {id: {type: GraphQLString}},
            resolve(parentValue, args) {
                return axios.get(`http://localhost:3000/cats/${args.id}`).then(res=>res.data)
            }
        },
        owner: {
            type: OwnerType,
            args: {id: {type: GraphQLString}},
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
                id: {type: new GraphQLNonNull(GraphQLString)},
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
            args: {id: {type: new GraphQLNonNull(GraphQLString)}}, //gotcha: forgetting to mark a required field within the new graph ql non null helper object
            resolve(parentValue, {id}){
                return axios.delete(`http://localhost:3000/cats/${id}`).then(res=>res.data)
            }
        },
        setCatAge: {
            type: CatType,
            args: {id: {type: new GraphQLNonNull(GraphQLString)}, age: {type: new GraphQLNonNull(GraphQLInt)}},
            resolve(parentValue, {id, age}){
                return axios.patch(`http://localhost:3000/cats/${id}`, {age}).then(res=>res.data)
            }
        }, //our JSON server would manage updating bidirectional relation bw owners and cats automatically.
        //otherwise may need to do so oneself
        setCatOwner: {
            type: CatType,
            args: {id: {type: new GraphQLNonNull(GraphQLString)}, ownerId: {type: new GraphQLNonNull(GraphQLString)}},
            resolve(parentValue, {id, ownerId}){
                return axios.patch(`http://localhost:3000/cats/${id}`, {ownerId}).then(res=>res.data)
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

