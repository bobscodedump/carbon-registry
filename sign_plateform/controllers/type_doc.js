const { type_doc} = require("../models/class_api_intern/type_doc");
const { isNotEmpty, generateauthenticateToken, isObjectsuccess, verifierID } = require("../models/function_intern/function");

const class_test = new type_doc()
var create_test = async(req,res)=>{

    if(isNotEmpty(req.body.Intitule_Type_doc,

    ) ){
        // res.status(403).json({ message: 'Empty Token' })
        let data = await class_test.read({Intitule_Type_doc:req.body.Intitule_Type_doc})
        if(data.length==0){
            let date = new Date()
        let val = await class_test.create({
            
            Intitule_Type_doc :req.body.Intitule_Type_doc,
            Date_creation : date,
            Date_modification : date,
            Datesystem : date,






        })
        // res.status(402).json({ message: 'Error Token' })
        isObjectsuccess(val._id)?res.status(200).json({status:200, message: 'Success',data:val }):res.status(404).json({status:404, message: 'Error system' })
        }else{
            res.status(401).json({status:401, message: 'Intitule error' })
        }
      
        
    }else{
        res.status(401).json({status:401, message: 'Empty data' })
    }
    
   
}
var read_test = async(req,res)=>{

    if(isNotEmpty(req.body._id) && verifierID(req.body._id) ){
       
        let val = await class_test.read(req.body)
     
      
        isObjectsuccess(val)?res.status(200).json({status:200, message: 'Success',data:val }):res.status(404).json({status:404, message: 'Error system' })
    }else{
        if(req.body._id===undefined){
            let val = await class_test.read(req.body)
     
      
            isObjectsuccess(val)?res.status(200).json({status:200, message: 'Success',data:val }):res.status(404).json({status:404, message: 'Error system' })
        }else{
            res.status(405).json({status:405, message: 'Error Id' })
        }
        
    }
}
var update_test = async(req,res)=>{
    if(isNotEmpty(req.body._id) && verifierID(req.body._id)){
       
    
        let val = await class_test.update(req.body._id,req.body)

        console.log(val)
       val?res.status(200).json({status:200, message: 'Success' }):res.status(404).json({status:404, message: 'Error system' })
        
    }else{
        res.status(401).json({status:401, message: 'Empty data' })
    }
}
var delete_test = async(req,res)=>{
    console.log(req.body)
    if(isNotEmpty(req.body._id) && verifierID(req.body._id) ){
       
    
        let val = await class_test.delete(req.body._id)
       val?res.status(200).json({status:200, message: 'Success' }):res.status(404).json({status:404, message: 'Error system' })
        
    }else{
        res.status(401).json({status:401, message: 'Empty data' })
    }
}
module.exports={
    create_test:create_test,
    read_test:read_test,
    update_test:update_test,
    delete_test:delete_test,
}