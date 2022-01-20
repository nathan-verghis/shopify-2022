// Variables
var inventoryHeader = "<thead><th>Product ID</th><th>Product Name</th><th>Warehouse ID</th><th>Quantity</th><th>Meta Tags</th><th>Delete</th></thead><tbody>";
var selectedUpdate = null;


// AJAX calls for document load
jQuery(document).ready(function() {

    // Update table on page load
    jQuery.ajax({
        type: 'get',
        dataType: 'json',
        url: '/getInventory',
        data: {},
        success: function(data) {
            if (data.message == "error") {
                alert("There was a problem retrieving inventory!");
            } else {
                let hasData = 0;
                let table = inventoryHeader;
                let numRows = data.data.length;
                let uniqueIdentifier;
                
                // Create table dynamically
                for (var i = 0; i < numRows; i++) {
                    hasData = 1;
                    uniqueIdentifier = data.data[i].product_id + "," + data.data[i].warehouse_id;
                    table = table + "<tr><td><input type='radio' onclick='update_entry(this)' name='update' id='update," + uniqueIdentifier + "'> " + data.data[i].product_id + "</td><td>" + data.data[i].name + "</td><td>" + data.data[i].warehouse_id + "</td><td>" + data.data[i].Quantity + "</td><td>" + data.data[i].meta + "</td><td><input type='button' onclick='delete_entry(this)' class='btn btn-secondary' value='Delete Entry' id='delete," + uniqueIdentifier + "'></td></tr>";
                }
                // Default value if database is empty
                if (hasData == 0) {
                    table = table + "<tr><td>No Data</td><td>No Data</td><td>No Data</td><td>No Data</td><td>No Data</td></tr>"
                }
                table = table + "</tbody>";
                jQuery('#Inventory').html(table);
                console.log("Inventory table updated with: " + JSON.stringify(data.data));
            }
        },
        fail: function(error) {
            console.log(error);
        }
    });

    $('#createField').submit(function(e) {
        e.preventDefault();
        let PID = $('#newPID').val();
        let WID = $('#newWID').val();
        let quantity = $('#newQuantity').val();
        let name = $('#newName').val();
        let meta = $('#newMeta').val();
        
        $.ajax({
            type: 'post',
            dataType: 'json',
            url: '/createEntry',
            data: {
                product_id: PID,
                product_name: name,
                warehouse_id: WID,
                quantity: quantity,
                meta: meta
            },
            success: function(data) {
                if (data.message == "error") {
                    if (data.message.length != 0) {
                        alert(data.reason);
                    }
                } else {
                    console.log("New inventory item successfully added!");
                }
                location.reload();
            },
            fail: function(error) {
                console.log(error);
            }
        });
    });

    $('#exportButton').click(function() {

        $.ajax({
            type: 'get',
            dataType: 'json',
            url: '/export',
            data: {},
            success: function(data) {
                if (data.message == 'error') {
                    alert("There was a problem trying to export the CSV file!");
                } else {
                    let dataArray = data.data.split("\n");
                    let final = [];
                    let i = 0;
                    let csv = "";

                    // Create array of data from response
                    for (i = 0; i < dataArray.length; i++) {
                        final.push(dataArray[i].split(","));
                    }

                    final.forEach(function(row) {
                        csv += row.join(',');
                        csv += '\n';
                    });

                    // Create a hidden element on page used to download the data as a csv file named 'inventory_export.csv'
                    document.write(csv);

                    var hiddenElement = document.createElement('a');  
                    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);  
                    hiddenElement.target = '_blank';  
                      
                    //provide the name for the CSV file to be downloaded  
                    hiddenElement.download = 'inventory_export.csv';  
                    hiddenElement.click();
                    location.reload();
                }
            },
            fail: function(error) {
                console.log(error);
            }
        });
    });

    $('#updateField').submit(function(e) {
        e.preventDefault();
        let PID = $('#updatePID').val();
        let WID = $('#updateWID').val();
        let quantity = $('#updateQuantity').val();
        let name = $('#updateName').val();
        let meta = $('#updateMeta').val();
        
        $.ajax({
            type: 'post',
            dataType: 'json',
            url: '/updateEntry',
            data: {
                product_id: PID,
                product_name: name,
                warehouse_id: WID,
                quantity: quantity,
                meta: meta,
                selected: selectedUpdate
            },
            success: function(data) {
                if (data.message == "error") {
                    if (data.message.length != 0) {
                        alert(data.reason);
                    }
                } else {
                    console.log("Inventory item successfully updated!");
                }
                location.reload();
            },
            fail: function(error) {
                console.log(error);
            }
        });
    });
});


function delete_entry(button) {
    let buttonID = button.id.split(',');

    $.ajax({
        type: 'post',
        dataType: 'json',
        url: '/deleteEntry',
        data: {
            product_id: buttonID[1],
            warehouse_id: buttonID[2]
        },
        success: function(data) {
            if (data.message == "error") {
                alert("Unable to delete entry in database");
            } else {
                console.log("Successfully deleted entry of Product ID:" + buttonID[1] + " and Warehouse ID:" + buttonID[2]);
            }
        }, 
        fail: function(error) {
            console.log(error);
        }
    });

    location.reload();
}

// After selecting a radio choice of inventory entry, make the update button visible.
function update_entry(button) {
    selectedUpdate = button.id.split(',');
    $('#updateButton').css("visibility", "visible");
}
