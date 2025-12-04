// Sample code with various issues for testing

function calculateTotal(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

function processUserInput(userInput) {
    // Security issue: eval
    eval(userInput);
    
    // Bug: potential null reference
    var data = getUserData();
    console.log(data.name.toUpperCase());
}

function getUserData() {
    return null;
}

// Anti-pattern: callback hell
function fetchData(callback) {
    setTimeout(function() {
        callback(function() {
            callback(function() {
                callback(function() {
                    console.log("Done!");
                });
            });
        });
    }, 1000);
}

// Complexity issue: deeply nested conditionals
function complexFunction(a, b, c, d) {
    if (a) {
        if (b) {
            if (c) {
                if (d) {
                    return "all true";
                } else {
                    return "d false";
                }
            } else {
                return "c false";
            }
        } else {
            return "b false";
        }
    } else {
        return "a false";
    }
}