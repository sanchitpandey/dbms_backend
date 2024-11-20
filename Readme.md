## Routes

http://url:5000/listings [POST]
sample body:
{
"start_date": "2024-11-20",
"end_date": "2024-11-25"
}
lists all available listings between start_date and end_date

http://url:5000/add-user [POST]
sample body:
{
"user_name": "John Doe",
"email": "johndoe@example.com",
"password": "securepassword123",
"role": "USER",
"birthdate": "1990-01-01",
"gender": "Male",
"phone": "+1234567890"
}
or
{
"user_name": "Jane Smith",
"email": "janesmith@example.com",
"password": "mypassword456",
"role": "GUEST",
"birthdate": "1995-05-15",
"gender": "Female",
"phone": "+0987654321"
}

http://url:5000/list-property [POST]
sample body:
{
"host_id": 101,
"address": "456 Elm Street",
"city": "Los Angeles",
"state": "CA",
"country": "USA",
"description": "Modern studio apartment.",
"property_type": "Studio",
"prop_name": "Urban Retreat",
"price_nightly": 120
}
host_id should be in users

http://url:5000/book-property [POST]
sample body:
{
"guest_id": 101,
"property_id": 4,
"start_date": "2024-11-20",
"end_date": "2024-11-25"
}
guest_id has to be a GUEST user
