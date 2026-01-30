module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "content-type": "application/json" },
    body: [
      { retailer: "AMZ", category: "DEFAULT", retailer_item_id: "12345", retailer_item_number: "12345" }
    ]
  };
};
