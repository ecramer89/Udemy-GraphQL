const {
    GraphQLString,
    GraphQLObjectType,
    GraphQLList,
    GraphQLSchema
} = require('graphql')



const sampleCharacters = [{
    id: "0",
    name: "kaz",
    responseId: "1"
}]
const sampleInputs = [{
    id: "2",
    text: "I like cats",
    responseId: "3"
}]
const sampleResponses = [
    {
       id: "1",
       text: "what do you like?",
       inputIds: ["2"]
    },

    {
        id: "3",
        text: "good to hear?",
        inputIds: []

    }

]

//in the graphql schema we define all relations between types.
//because our database will probably just have a list of ids or an id, we need to define a resolver function to tell graphql how exactly o
//retrieve it
const CharacterType = new GraphQLObjectType({
    name: "Character",
    fields: ()=>({
        name: {type: GraphQLString},
        currentText: {
            type: ResponseType,
            resolve(character){
                //we will be hosting the data eventually on an external server but for now we will write out the lists ourselves as sample data
                return sampleResponses.find(response=>response.id === character.responseId)
            }}
    })
})


const InputType = new GraphQLObjectType({
    name: "Input",
    fields: ()=>({ //trick to avoid circular references
        text: {type: GraphQLString},
        leadsTo: {
            type: ResponseType,
            resolve(input){
                return sampleResponses.find(response=>response.id === input.responseId)
            }
        }
    })
})


const ResponseType = new GraphQLObjectType({
    name: "Response",
    fields: ()=>({
       text: {type: GraphQLString},
        acceptedInput: {
           type: new GraphQLList(InputType),
            resolve(response){
               return response.inputIds.map(inputId=>sampleInputs.find(input=>input.id === inputId))
            }
       }
    })
})

//in graphql the input to each query is the value that was returned by the preceding query. so what happens when there weren't any preceding queries?

//the name doesn't really matter, but each field defines an entry point into the graph.
//i'm saying that you could in principle as a user of the application from the outside GET any of these resouces, but realistically since
//inputs and responses are associated with a character (and don't really exist on their own)
//i wouldn't need to. because actually as you can see, my fdefinition of the character defines how to fetch the data of the input and that of the responses defineshow to fetch data for the responses
const query = new GraphQLObjectType({
    name: "query",
    fields: {
        character: {
            type: CharacterType,
            args: {id: {type: GraphQLString}},
                resolve(parentValue, args) {
                    return sampleCharacters.find(character => character.id === args.id)
                }
            },
        characters: {
            type: new GraphQLList(CharacterType),
            resolve(parentValue){
                return sampleCharacters
            }
        }
    }
})


module.exports = new GraphQLSchema({query})

