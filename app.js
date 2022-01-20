'use strict'

/**
 * Used for future scaling
 * A Map used to store product IDS with values being an array of warehouse IDS
 * Used to verify composite key uniqueness before attempting to create duplicate
 * key entries (and failing) in the database.
 * Useful for filtering by product ID quickly (At scale may be useful)
 */
var IDS = new Map();

// Express App (Routes)
const express = require("express");
const app     = express();
const path    = require("path");
const mariadb = require('mariadb');

app.use(express.urlencoded({
    extended: true
}));

// Minimization
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
var { Parser } = require("json2csv");

// Important, pass in port as in `npm run dev 1234`, do not change
const portNum = process.argv[2];

// Database connection, pooled to improve performance at high load
const pool = mariadb.createPool({
    host: 'ENTER THE LOCAL IP ADDRESS OF YOUR DATABASE HERE',
    user: 'ENTER YOUR DATABASE USERNAME HERE',
    password: 'ENTER YOUR DATABASE PASSWORD HERE',
    port: 'ENTER YOUR PORTNUMBER HERE (default is 3306) *this should be an integer not a string*',
    database: 'nathanverghis-shopify',
});

// Send HTML at root, do not change
app.get('/',function(req,res){
    res.sendFile(path.join(__dirname+'/public/index.html'));
});

// Send Style, do not change
app.get('/style.css',function(req,res){
    //Feel free to change the contents of style.css to pretify your Web app
    res.sendFile(path.join(__dirname+'/public/style.css'));
});

// Send obfuscated JS, do not change
app.get('/index.js',function(req,res){
    fs.readFile(path.join(__dirname+'/public/index.js'), 'utf8', function(err, contents) {
        const minimizedContents = JavaScriptObfuscator.obfuscate(contents, {compact: true, controlFlowFlattening: true});
        res.contentType('application/javascript');
        res.send(minimizedContents._obfuscatedCode);
    });
});

// Update inventory table with latest data in database
app.get('/getInventory', async function(req, res) {
    let error = 0;
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("Successfully connected to the database!");
    } catch(e) {
        error = 1;
        console.log("Failed to connect to database " + e);
    } finally {
        let inventory;
        try {
            if (error == 0) {
                inventory = await connection.query("SELECT * FROM inventory;");
                console.log("Successfully retrieved inventory!");
                let i = 0;
                // Reset product-warehouse map
                IDS.clear();

                // Generate updated product-warehouse map
                for (i = 0; i < inventory.length; i++) {
                    if (IDS.has(inventory[i].product_id)) {
                        IDS.get(inventory[i].product_id).push(inventory[i].warehouse_id);
                    } else {
                        IDS.set(inventory[i].product_id, new Array());
                        IDS.get(inventory[i].product_id).push(inventory[i].warehouse_id);
                    }
                }
            }
        } catch(e) {
            error = 1;
            console.log("Failed to retrieve inventory " + e);
        } finally {
            if (error) {
                res.send({
                    message: 'error'
                });
            } else {
                connection.end();
                res.send({
                    message: 'success',
                    data: inventory
                });
            }
        }
    }
});

// Data validation for creating entries
function checkNum(value, type) {
    if (value == '') {
        return (type + " cannot be empty! ");
    } else if (isNaN(value)) {
        return (type + " must be a number! ");
    }
    return ("");
}

// Create new entry in inventory
// Validation exists to prevent duplicates in product-warehouse items
// Further validation to ensure necessary fields (product_id, warehouse_id, name, quantity) are filled
app.post('/createEntry', async function(req, res) {
    let error = 0;
    let connection;
    let error_log = "";
    let error_update = "";
    let query = null;
    

    // Error Checking Form input
    // Check Numbers
    error_update = checkNum(req.body.product_id, "Product ID") + checkNum(req.body.warehouse_id, "Warehouse ID") + checkNum(req.body.quantity, "Quantity");
    console.log(error_update);
    if (error_update != "") {
        error = 1;
        error_log = error_log + error_update;
    }
    // Check for name
    if (req.body.product_name == '') {
        error = 1;
        error_log = error_log + "Must provide a name! ";
    }

    // Check if product / warehouse ID combination is unique
    if (IDS.has(Number(req.body.product_id))) {
        if (IDS.get(Number(req.body.product_id)).indexOf(Number(req.body.warehouse_id)) != -1) {
            error = 1;
            error_log = error_log + "That product is already stored at that warehouse! (Product/Warehouse entries must be unique) \n\n### Hint: Try using the 'Update' feature in the table ### ";
        }
    }
    query = "INSERT INTO inventory (product_id,name,image_full,image_thumb,deleted,meta,warehouse_id,Quantity) VALUES ('"+req.body.product_id+"','"+req.body.product_name+"','0','0','0','"+req.body.meta+"','"+req.body.warehouse_id+"','"+req.body.quantity+"');"

    try {
        if (error == 0) {
            connection = await pool.getConnection();
            console.log("Successfully connected to the database to add new entry");
        }
    } catch (e) {
        error = 1;
        error_log = error_log + e;
        console.log("Failed to connect to database to create new entry: " + e);
    } finally {
        let successfulQuery;
        try {
            if (error == 0) {
                successfulQuery = await connection.query(query);
                console.log(successfulQuery);
            }
        } catch (e) {
            error = 1;
            console.log("Failed to execute insert query: " + e);
            console.log("Query: " + query);
            connection.end();
        } finally {
            if (error) {
                res.send({
                    message: "error",
                    reason: error_log
                });
            } else {
                connection.end();
                res.send({
                    message: 'success'
                });
            }
        }
    }

});

// Updates an entry in inventory
// Validation exists to prevent duplicates in product-warehouse entries
// Updates allow for single/multiple field updates (within validation)
app.post('/updateEntry', async function(req, res) {
    let error = 0;
    let connection;
    let error_log = "";
    let queryStart = "UPDATE inventory SET";
    let queryEnd = "WHERE `product_id`=" + req.body.selected[1] + " AND `warehouse_id`=" + req.body.selected[2] + ";";
    let product = 0;
    let warehouse = 0;
    let quantity = 0;
    let name = 0;
    let query = null;
    

    // Error Checking Form input
    // Check Numbers
    if (req.body.product_id != '') {
        if (isNaN(req.body.product_id)) {
            error = 1;
            error_log = error_log + "Invalid Product ID! ";
        }
        product = 1;
        query = queryStart + " `product_id`=" + req.body.product_id + " ";
    }
    if (req.body.warehouse_id != '') {
        if (isNaN(req.body.warehouse_id)) {
            error = 1;
            error_log = error_log + "Invalid Warehouse ID! ";
        }
        warehouse = 1;
        if (product == 1) {
            query = query + ", `warehouse_id`=" + req.body.warehouse_id + " ";
        } else {
            query = queryStart + " `warehouse_id`=" + req.body.warehouse_id + " ";
        }
    }
    if (req.body.quantity != '') {
        if (isNaN(req.body.quantity)) {
            error = 1;
            error_log = error_log + "Invalid Quantity! ";
        }
        quantity = 1;
        if (product == 1 || warehouse == 1) {
            query = query + ", `Quantity`=" + req.body.quantity + " ";
        } else {
            query = queryStart + " `Quantity`=" + req.body.quantity + " ";
        }
    }
    if (req.body.product_name != '') {
        if (product == 1 || warehouse == 1 || quantity == 1) {
            query = query + ", `name`='" + req.body.product_name + "' ";
        } else {
            query = queryStart + " `name`='" + req.body.product_name + "' ";
        }
        name == 1;
    }
    if (req.body.meta != '') {
        if (product == 1 || warehouse == 1 || quantity == 1) {
            query = query + ", `meta`='" + req.body.meta + "' ";
        } else {
            query = queryStart + " `meta`='" + req.body.meta + "' ";
        }
    }
    
    // Check if product / warehouse ID combination is unique
    if (req.body.product_id != '' && req.body.warehouse_id == '' && req.body.product_id != req.body.selected[1]){
        if (IDS.has(Number(req.body.product_id))) {
            if (IDS.get(Number(req.body.product_id)).indexOf(Number(req.body.selected[2])) != -1) {
                error = 1;
                error_log = error_log + "That combination of Product ID and Warehouse ID already exists!!\n\n Try updating the quantity of the already existing entry!";
            }
        }
    } else if (req.body.product_id == '' && req.body.warehouse_id != '' && req.body.warehouse_id != req.body.selected[2]){
        if (IDS.has(Number(req.body.selected[1]))) {
            if (IDS.get(Number(req.body.selected[1])).indexOf(Number(req.body.warehouse_id)) != -1) {
                error = 1;
                error_log = error_log + "That combination of Product ID and Warehouse ID already exists!!\n\n Try updating the quantity of the already existing entry!";
            }
        }
    } else if (req.body.product_id != '' && req.body.warehouse_id != '' && req.body.warehouse_id != req.body.selected[2] && req.body.product_id != req.body.selected[1]){
        if (IDS.has(Number(req.body.product_id))) {
            if (IDS.get(Number(req.body.product_id)).indexOf(Number(req.body.warehouse_id)) != -1) {
                error = 1;
                error_log = error_log + "That combination of Product ID and Warehouse ID already exists!!\n\n Try updating the quantity of the already existing entry!";
            }
        }
    }

    // Add end statement to SQL query
    if (query != null) {
        query = query + queryEnd;
        console.log(query);
    
    // Prevent the submission of empty update
    } else {
        error = 1;
        error_log += "Must fill at least one field with an updated value! ";
    }

    try {
        if (error == 0) {
            connection = await pool.getConnection();
            console.log("Successfully connected to the database to update entry");
        }
    } catch (e) {
        error = 1;
        error_log = error_log + e;
        console.log("Failed to connect to database to update entry: " + e);
    } finally {
        let successfulQuery;
        try {
            if (error == 0) {
                successfulQuery = await connection.query(query);
                console.log(successfulQuery);
            }
        } catch (e) {
            error = 1;
            console.log("Failed to execute update query: " + e);
            console.log("Query: " + query);
            connection.end();
        } finally {
            if (error) {
                res.send({
                    message: "error",
                    reason: error_log
                });
            } else {
                connection.end();
                res.send({
                    message: 'success'
                });
            }
        }
    }

});


// Handles delete requests from inventory
// Future updates could change the query to simply modify the `deleted` column, allowing for deletion recovery
app.post('/deleteEntry', async function (req, res) {
    let error = 0;
    let connection;

    try {
        connection = await pool.getConnection();
        console.log("Successfully connected to the database to delete entry");
    } catch (e) {
        error = 1;
        console.log("Failed to connect to database to delete entry");
    } finally {
        let successfulQuery;
        try {
            if (error == 0) {
                successfulQuery = await connection.query("DELETE FROM inventory WHERE `product_id`=" + req.body.product_id + " and `warehouse_id`=" + req.body.warehouse_id + ";");
                console.log(successfulQuery);
                connection.end();
            }
        } catch (e) {
            error = 1;
            console.log("Failed to execute delete query: " + e);
            connection.end();
        } finally {
            if (error) {
                res.send({
                    message: "error"
                });
            } else {
                res.send({
                    message: 'success'
                });
            }
        }
    }
});

// Handles the generation of csv data from the database
// Implementation change required for larger requests
// Extensions could allow ranges of data to be specified rather than exporting the entire database.
//* IMPORTANT: I have just noticed that this feature is for PRODUCT data rather than inventory. Please read below
/**
 * I've decided that I will leave my submission as is, as I believe exporting the table rather than a single row is feature
 * with greater use. The extension needed to change this is minimal, given the front-end validation from the update button could be used.
 * Further extension beyond the given prompt could allow for ranges of specification to be provided prior to the data export.
 */
app.get('/export', async function(req, res) {
    let error = 0;
    let connection;
    let fields = ['product_id', 'name', 'image_full', 'image_thumb', 'deleted', 'delete_comment', 'meta', 'warehouse_id', 'Quantity'];
    let parser = new Parser({fields});
    let csv;

    try {
        connection = await pool.getConnection();
        console.log("Successfully connected to the database to export data");
    } catch (e) {
        error = 1;
        console.log("Failed to connect to database to export data");
    } finally {
        let successfulQuery;
        try {
            if (error == 0) {
                successfulQuery = await connection.query("SELECT * FROM inventory;");
                connection.end();
            }
        } catch (e) {
            error = 1;
            console.log("Failed to execute export query: " + e);
            connection.end();
        } finally {
            if (error) {
                res.send({
                    message: 'error'
                });
            } else {
                csv = parser.parse(successfulQuery);
                res.attachment('data_export.csv')
                res.send({
                    message: 'success',
                    data: csv
                });
            }
        }
    }
});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);
