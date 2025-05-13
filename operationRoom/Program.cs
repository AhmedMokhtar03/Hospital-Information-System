using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Npgsql;
using operationRoom.Models;


var passwordGen = new PasswordHasher<string>();
var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new ByteArrayConverter());
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});
builder.Services.AddControllersWithViews();
var app = builder.Build();
app.UseCors("ReactPolicy");
app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthorization();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}


static string GetRawSSN(string formattedSSN)
{
    string digitsOnly = Regex.Replace(formattedSSN, @"\D", "");
    if (digitsOnly.Length > 14)
        digitsOnly = digitsOnly.Substring(0, 14);
    return digitsOnly;
}


app.MapPost("/login", async (LoginRequest request) =>
{
    if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        return Results.BadRequest("Email and password are required");

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();
        var cmd = new NpgsqlCommand(
            "SELECT id, email, password, fname, lname, gender, usertype FROM users WHERE email = @email",
            conn);
        cmd.Parameters.AddWithValue("email", request.Email);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return Results.Unauthorized();

        var userId = reader.GetInt32(0);
        var storedPassword = reader.GetString(2);
        var userType = reader.GetString(6);
        var verifyPassword = passwordGen.VerifyHashedPassword(null, storedPassword, request.Password);

        if (verifyPassword != PasswordVerificationResult.Success)
        {
            return Results.Unauthorized();
        }

        string redirectPath = userType.ToLower() switch
        {
            "patient" => "/patient-profile",
            "doctor" => "/doctor-profile",
            "admin" => "/admin-profile",
            _ => "/"
        };

        return Results.Ok(new
        {
            success = true,
            message = "Login successful",
            userId = userId,
            userType = userType,
            redirect = redirectPath
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/doctor-register", async (HttpRequest request, ILogger<Program> logger) =>
{
    var form = await request.ReadFromJsonAsync<DoctorRegisterRequest>();

    if (form == null)
        return Results.BadRequest("Form is empty");

    var validationContext = new ValidationContext(form);
    var validationResults = new List<ValidationResult>();
    bool isValid = Validator.TryValidateObject(form, validationContext, validationResults, true);

    if (!isValid)
    {
        var errors = validationResults.Select(vr => vr.ErrorMessage).ToList();
        return Results.BadRequest(new { errors });
    }

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        await using var transaction = await conn.BeginTransactionAsync();

        try
        {
            var securePassword = passwordGen.HashPassword(null, form.Password);

            var checkCmd = new NpgsqlCommand(
                "SELECT 1 FROM users WHERE email = @Email", conn, transaction);
            checkCmd.Parameters.AddWithValue("Email", form.Email);
            var exists = await checkCmd.ExecuteScalarAsync();
            if (exists != null)
            {
                await transaction.RollbackAsync();
                return Results.Conflict("Email already exists");
            }

            var userCmd = new NpgsqlCommand(
                @"INSERT INTO users (email, password, fname, lname,ssn ,address, gender, birthdate, usertype)
                VALUES (@email, @password, @fname, @lname, @ssn,@address, @gender, @birthdate, 'doctor')
                RETURNING id;", conn, transaction);

            string rawSSN = GetRawSSN(form.ssn);
            var birthdate = $"{form.BirthYear}-{form.BirthMonth.PadLeft(2, '0')}-{form.BirthDay.PadLeft(2, '0')}";

            userCmd.Parameters.AddWithValue("email", form.Email);
            userCmd.Parameters.AddWithValue("password", securePassword);
            userCmd.Parameters.AddWithValue("fname", form.FirstName);
            userCmd.Parameters.AddWithValue("lname", form.LastName);
            userCmd.Parameters.AddWithValue("ssn", rawSSN);
            userCmd.Parameters.AddWithValue("address", form.Address);
            userCmd.Parameters.AddWithValue("gender", form.Gender);
            userCmd.Parameters.AddWithValue("birthdate", DateTime.Parse(birthdate));

            var userId = (int)await userCmd.ExecuteScalarAsync();

            var doctorCmd = new NpgsqlCommand(
                @"INSERT INTO doctor (id) VALUES (@id)", conn, transaction);
            doctorCmd.Parameters.AddWithValue("id", userId);
            await doctorCmd.ExecuteNonQueryAsync();
            var deptCmd = new NpgsqlCommand(
                "SELECT departmentnumber FROM department WHERE departmentname = @name", conn, transaction);
            deptCmd.Parameters.AddWithValue("name", form.Department);
            var deptIdObj = await deptCmd.ExecuteScalarAsync();
            if (deptIdObj == null)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest("Invalid department");
            }

            var deptId = (int)deptIdObj;
            var insertDept = new NpgsqlCommand(
                @"INSERT INTO doctordepartment (did, dnumber) VALUES (@did, @dnumber)", conn, transaction);
            insertDept.Parameters.AddWithValue("did", userId);
            insertDept.Parameters.AddWithValue("dnumber", deptId);
            await insertDept.ExecuteNonQueryAsync();

            var phoneCmd = new NpgsqlCommand(
                @"INSERT INTO doctorsphonenumbers (did, number) VALUES (@did, @number)", conn, transaction);
            phoneCmd.Parameters.AddWithValue("did", userId);
            phoneCmd.Parameters.AddWithValue("number", form.PhoneNumber);
            await phoneCmd.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            return Results.Ok(new { message = "Doctor registered successfully!" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Database operation failed during doctor registration");
            throw;
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unexpected registration error");
        return Results.Problem("Something went wrong during registration. Please try again.");
    }
});

app.MapPost("/patient-register", async (HttpRequest request, ILogger<Program> logger) =>
{
    var form = await request.ReadFromJsonAsync<PatientRegisterRequest>();

    if (form == null)
        return Results.BadRequest("Form is empty");

    var validationContext = new ValidationContext(form);
    var validationResults = new List<ValidationResult>();
    bool isValid = Validator.TryValidateObject(form, validationContext, validationResults, true);

    if (!isValid)
    {
        var errors = validationResults.Select(vr => vr.ErrorMessage).ToList();
        return Results.BadRequest(new { errors });
    }

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        await using var transaction = await conn.BeginTransactionAsync();

        try
        {
            var checkCmd = new NpgsqlCommand(
                "SELECT 1 FROM users WHERE email = @Email", conn, transaction);
            checkCmd.Parameters.AddWithValue("Email", form.Email);
            var exists = await checkCmd.ExecuteScalarAsync();
            if (exists != null)
            {
                await transaction.RollbackAsync();
                return Results.Conflict("Email already exists");
            }

            var securePassword = passwordGen.HashPassword(null, form.Password);

            var userCmd = new NpgsqlCommand(
                @"INSERT INTO users 
                    (email, password, fname, lname, ssn,address, gender, birthdate, status, usertype)
                  VALUES 
                    (@email, @password, @fname, @lname, @ssn,@address, @gender, @birthdate, @maritalStatus, 'patient')
                  RETURNING id;",
                conn,
                transaction);
            string rawSSN = GetRawSSN(form.ssn);

            userCmd.Parameters.AddWithValue("email", form.Email);
            userCmd.Parameters.AddWithValue("password", securePassword);
            userCmd.Parameters.AddWithValue("fname", form.FirstName);
            userCmd.Parameters.AddWithValue("lname", form.LastName);
            userCmd.Parameters.AddWithValue("ssn", rawSSN);
            userCmd.Parameters.AddWithValue("address", form.Address);
            userCmd.Parameters.AddWithValue("gender", form.Gender);
            userCmd.Parameters.AddWithValue("maritalStatus", form.MaritalStatus);

            var birthdate = $"{form.BirthYear}-{form.BirthMonth.PadLeft(2, '0')}-{form.BirthDay.PadLeft(2, '0')}";
            userCmd.Parameters.AddWithValue("birthdate", DateTime.Parse(birthdate));

            var userId = (int)await userCmd.ExecuteScalarAsync();

            var patientCmd = new NpgsqlCommand(
                @"INSERT INTO patient (id, chroincdiseases, bloodgroup, insurance) 
                  VALUES (@patientId, @medicalHistory, @bloodGroup, @insurance)",
                conn, transaction);
            patientCmd.Parameters.AddWithValue("patientId", userId);
            patientCmd.Parameters.AddWithValue("medicalHistory", form.MedicalHistory);
            patientCmd.Parameters.AddWithValue("bloodGroup", form.BloodGroup);
            patientCmd.Parameters.AddWithValue("insurance", form.Insurance);
            await patientCmd.ExecuteNonQueryAsync();
            var phoneCmd = new NpgsqlCommand(
                @"INSERT INTO patientphonenumbers (pid, number)
                  VALUES (@userId, @phone)",
                conn,
                transaction);
            phoneCmd.Parameters.AddWithValue("userId", userId);
            phoneCmd.Parameters.AddWithValue("phone", form.PhoneNumber);
            await phoneCmd.ExecuteNonQueryAsync();
            await transaction.CommitAsync();
            return Results.Ok(new
            {
                message = "Patient registered successfully",
                userId = userId
            });
        }
        catch (PostgresException ex) when (ex.SqlState == "23505") 
        {
            await transaction.RollbackAsync();
            return Results.Conflict("Email already exists");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Database operation failed during patient registration");
            throw;
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unexpected registration error");
        return Results.Problem("Something went wrong during registration. Please try again.");
    }
});

app.MapGet("/patient-profile", async (HttpRequest request, ILogger<Program> logger) =>
{
    string userIdParam = request.Query["userId"];
    if (string.IsNullOrEmpty(userIdParam) || !int.TryParse(userIdParam, out int userId))
    {
        return Results.BadRequest("Valid user ID is required");
    }

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        var cmd = new NpgsqlCommand(
            @"SELECT 
        u.id, u.fname, u.lname, u.gender, u.birthdate, u.email, u.address, u.ssn,
        p.bloodgroup, p.insurance, p.chroincdiseases, u.picture
      FROM users u
      JOIN patient p ON u.id = p.id
      WHERE u.id = @userId", conn);

        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return Results.NotFound("Patient not found");
        }

        await using var conn2 = new NpgsqlConnection(connectionString);
        await conn2.OpenAsync();
        var phoneCmd = new NpgsqlCommand(
            "SELECT number FROM patientphonenumbers WHERE pid = @pid LIMIT 1", conn2);
        phoneCmd.Parameters.AddWithValue("pid", userId);
        var phoneNumber = await phoneCmd.ExecuteScalarAsync() as string ?? "";

        var profileImage = reader.IsDBNull(11) ? null : Convert.ToBase64String((byte[])reader["picture"]);

        var response = new
        {
            id = reader.GetInt32(0),
            firstName = reader.GetString(1),
            lastName = reader.GetString(2),
            name = $"{reader.GetString(1)} {reader.GetString(2)}",
            gender = reader.GetString(3),
            birthdate = reader.GetDateTime(4).ToString("yyyy-MM-dd"),
            email = reader.GetString(5),
            address = reader.IsDBNull(6) ? "" : reader.GetString(6),
            ssn = reader.IsDBNull(7) ? "" : reader.GetString(7),
            bloodGroup = reader.GetString(8),
            insurance = reader.GetString(9),
            chronicDiseases = reader.IsDBNull(10) ? "" : reader.GetString(10),
            phoneNumber = phoneNumber,
            profileImage = profileImage != null ? $"data:image/png;base64,{profileImage}" : null
        };

        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error fetching patient profile");
        return Results.Problem("Error retrieving patient data");
    }
});

app.MapPut("/patient-profile", async (HttpRequest request, ILogger<Program> logger) =>
{
    try
    {
        var form = await request.ReadFromJsonAsync<PatientProfileUpdateRequest>();
        if (form == null)
        {
            return Results.BadRequest("Invalid request data");
        }

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        using var transaction = await conn.BeginTransactionAsync();
        try
        {
            // Update users table
            var userCmd = new NpgsqlCommand(
                @"UPDATE users 
                SET fname = @firstName,
                    lname = @lastName,
                    gender = @gender,
                    address = @address
                WHERE id = @userId", conn, transaction);

            var nameParts = form.Name.Split(' ');
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : "";

            userCmd.Parameters.AddWithValue("firstName", firstName);
            userCmd.Parameters.AddWithValue("lastName", lastName);
            userCmd.Parameters.AddWithValue("gender", form.Gender);
            userCmd.Parameters.AddWithValue("address", form.Address);
            userCmd.Parameters.AddWithValue("userId", form.Id);
            await userCmd.ExecuteNonQueryAsync();

            // Update patient table
            var patientCmd = new NpgsqlCommand(
                @"UPDATE patient 
                SET bloodgroup = @bloodGroup,
                    insurance = @insurance,
                    chroincdiseases = @chronicDiseases
                WHERE id = @userId", conn, transaction);

            patientCmd.Parameters.AddWithValue("bloodGroup", form.BloodGroup);
            patientCmd.Parameters.AddWithValue("insurance", form.Insurance);
            patientCmd.Parameters.AddWithValue("chronicDiseases", form.ChronicDiseases ?? "");
            patientCmd.Parameters.AddWithValue("userId", form.Id);
            await patientCmd.ExecuteNonQueryAsync();

            // Update phone number
            var phoneCmd = new NpgsqlCommand(
                @"UPDATE patientphonenumbers
                SET number = @phoneNumber
                WHERE pid = @userId", conn, transaction);

            phoneCmd.Parameters.AddWithValue("phoneNumber", form.PhoneNumber);
            phoneCmd.Parameters.AddWithValue("userId", form.Id);
            await phoneCmd.ExecuteNonQueryAsync();

            // Update profile image if provided
            if (!string.IsNullOrEmpty(form.ProfileImage))
            {
                var imageCmd = new NpgsqlCommand(
                    @"UPDATE users 
                    SET picture = @profileImage
                    WHERE id = @userId", conn, transaction);

                imageCmd.Parameters.AddWithValue("profileImage", Convert.FromBase64String(form.ProfileImage.Split(',')[1]));
                imageCmd.Parameters.AddWithValue("userId", form.Id);
                await imageCmd.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();
            return Results.Ok(new { message = "Profile updated successfully" });
        }
        catch (Exception ex)
        {
            try
            {
                await transaction.RollbackAsync();
            }
            catch (Exception rollbackEx)
            {
                logger.LogError(rollbackEx, "Error rolling back transaction");
            }
            throw;
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error updating patient profile");
        return Results.Problem("Failed to update profile. Please try again.");
    }
});


app.MapGet("/doctor-profile", async (HttpRequest request, ILogger<Program> logger) =>
{
    string userIdParam = request.Query["userId"];
    if (string.IsNullOrEmpty(userIdParam) || !int.TryParse(userIdParam, out int userId))
    {
        return Results.BadRequest("Valid user ID is required");
    }

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        var cmd = new NpgsqlCommand(
            @"SELECT 
        u.id, u.fname, u.lname, u.gender, u.birthdate, u.email, u.address, u.ssn,
        d.departmentname, u.picture
      FROM users u
      JOIN doctordepartment dd ON u.id = dd.did
      JOIN department d ON d.departmentnumber=dd.dnumber
      WHERE u.id = @userId", conn);

        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return Results.NotFound("doctor not found");
        }

        await using var conn2 = new NpgsqlConnection(connectionString);
        await conn2.OpenAsync();
        var phoneCmd = new NpgsqlCommand(
            "SELECT number FROM doctorsphonenumbers WHERE did = @did LIMIT 1", conn2);
        phoneCmd.Parameters.AddWithValue("did", userId);
        var phoneNumber = await phoneCmd.ExecuteScalarAsync() as string ?? "";

        var profileImage = reader.IsDBNull(9) ? null : Convert.ToBase64String((byte[])reader["picture"]);

        var response = new
        {
            id = reader.GetInt32(0),
            firstName = reader.GetString(1),
            lastName = reader.GetString(2),
            name = $"{reader.GetString(1)} {reader.GetString(2)}",
            gender = reader.GetString(3),
            birthdate = reader.GetDateTime(4).ToString("yyyy-MM-dd"),
            email = reader.GetString(5),
            address = reader.IsDBNull(6) ? "" : reader.GetString(6),
            ssn = reader.IsDBNull(7) ? "" : reader.GetString(7),
            department = reader.GetString(8),
            phoneNumber = phoneNumber,
            profileImage = profileImage != null ? $"data:image/png;base64,{profileImage}" : null
        };

        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error fetching doctor profile");
        return Results.Problem("Error retrieving doctor data");
    }
});

app.MapPut("/doctor-profile", async (HttpRequest request, ILogger<Program> logger) =>
{
    try
    {
        var form = await request.ReadFromJsonAsync<DoctorProfileUpdateRequest>();
        if (form == null) return Results.BadRequest("Invalid data");

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        using var transaction = await conn.BeginTransactionAsync();
        try
        {
            var nameParts = form.Name?.Trim().Split(' ', 2) ?? Array.Empty<string>();
            var firstName = nameParts.Length > 0 ? nameParts[0] : "";
            var lastName = nameParts.Length > 1 ? nameParts[1] : "";
            var userCmd = new NpgsqlCommand(
                @"UPDATE users 
                SET fname = @fname, lname = @lname, gender = @gender, 
                    address = @address, email = @email, picture = @picture
                WHERE id = @userId", conn, transaction);

            byte[] imageBytes = Array.Empty<byte>();
            if (!string.IsNullOrEmpty(form.profileImage))
            {
                var base64Data = form.profileImage.Split(',').Last();
                imageBytes = Convert.FromBase64String(base64Data);
            }

            userCmd.Parameters.AddWithValue("fname", firstName);
            userCmd.Parameters.AddWithValue("lname", lastName);
            userCmd.Parameters.AddWithValue("gender", form.Gender);
            userCmd.Parameters.AddWithValue("address", form.Address);
            userCmd.Parameters.AddWithValue("email", form.EmailAddress);
            userCmd.Parameters.AddWithValue("picture", imageBytes);
            userCmd.Parameters.AddWithValue("userId", form.Id);
            await userCmd.ExecuteNonQueryAsync();

            var deptCmd = new NpgsqlCommand(
                "SELECT departmentnumber FROM department WHERE departmentname = @name", conn, transaction);
            deptCmd.Parameters.AddWithValue("name", form.department);
            var deptIdObj = await deptCmd.ExecuteScalarAsync();
            if (deptIdObj == null)
            {
                await transaction.RollbackAsync();
                return Results.BadRequest("Invalid department");
            }

            var deptId = (int)deptIdObj;

            var insertDept = new NpgsqlCommand(
                @"UPDATE doctordepartment SET dnumber=@dnumber where did=@userId ", conn, transaction);
            insertDept.Parameters.AddWithValue("userId", form.Id);
            insertDept.Parameters.AddWithValue("dnumber", deptId);
            await insertDept.ExecuteNonQueryAsync();

            var phoneCmd = new NpgsqlCommand(
                @"UPDATE doctorsphonenumbers
                SET number = @phoneNumber
                WHERE did = @userId", conn, transaction);

            phoneCmd.Parameters.AddWithValue("phoneNumber", form.PhoneNumber);
            phoneCmd.Parameters.AddWithValue("userId", form.Id);
            await phoneCmd.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            return Results.Ok(new { message = "Profile updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Transaction error");
            return Results.Problem("Database update failed");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Global error");
        return Results.Problem("Internal server error");
    }
});

app.MapGet("/admin-profile", async (HttpRequest request, ILogger<Program> logger) =>
{
    string userIdParam = request.Query["userId"];
    if (string.IsNullOrEmpty(userIdParam) || !int.TryParse(userIdParam, out int userId))
    {
        return Results.BadRequest("Valid user ID is required");
    }

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        var cmd = new NpgsqlCommand(
            @"SELECT 
                u.id, u.fname, u.lname, u.gender, u.birthdate, u.email, u.address, u.ssn, u.picture
            FROM users u 
            WHERE u.id = @userId AND u.usertype = 'admin'",
            conn);

        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.NotFound("Admin not found");
        }

        var profileImage = reader.IsDBNull(8) ? null : Convert.ToBase64String((byte[])reader["picture"]);

        var response = new
        {
            id = reader.GetInt32(0),
            firstName = reader.GetString(1),
            lastName = reader.GetString(2),
            name = $"{reader.GetString(1)} {reader.GetString(2)}",
            gender = reader.GetString(3),
            birthdate = reader.GetDateTime(4).ToString("yyyy-MM-dd"),
            email = reader.GetString(5),
            address = reader.IsDBNull(6) ? "" : reader.GetString(6),
            ssn = reader.IsDBNull(7) ? "" : reader.GetString(7),
            profileImage = profileImage != null ? $"data:image/png;base64,{profileImage}" : null
        };

        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error fetching admin profile");
        return Results.Problem("Error retrieving admin data");
    }
});

app.MapPut("/admin-profile", async (HttpRequest request, ILogger<Program> logger) =>
{
    try
    {
        var form = await request.ReadFromJsonAsync<AdminProfileUpdateRequest>();
        if (form == null) return Results.BadRequest("Invalid data");

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        using var transaction = await conn.BeginTransactionAsync();
        try
        {
            var nameParts = form.Name?.Trim().Split(' ', 2) ?? Array.Empty<string>();
            var firstName = nameParts.Length > 0 ? nameParts[0] : "";
            var lastName = nameParts.Length > 1 ? nameParts[1] : "";

            var userCmd = new NpgsqlCommand(
                @"UPDATE users 
                SET fname = @fname, lname = @lname, gender = @gender, 
                    address = @address, email = @email, picture = @picture
                WHERE id = @userId AND usertype = 'admin'", conn, transaction);

            byte[] imageBytes = Array.Empty<byte>();
            if (!string.IsNullOrEmpty(form.ProfileImage))
            {
                var base64Data = form.ProfileImage.Split(',').Last();
                imageBytes = Convert.FromBase64String(base64Data);
            }

            userCmd.Parameters.AddWithValue("fname", firstName);
            userCmd.Parameters.AddWithValue("lname", lastName);
            userCmd.Parameters.AddWithValue("gender", form.Gender);
            userCmd.Parameters.AddWithValue("address", form.Address);
            userCmd.Parameters.AddWithValue("email", form.EmailAddress);
            userCmd.Parameters.AddWithValue("picture", imageBytes);
            userCmd.Parameters.AddWithValue("userId", form.Id);

            var rowsAffected = await userCmd.ExecuteNonQueryAsync();
            if (rowsAffected == 0)
            {
                await transaction.RollbackAsync();
                return Results.NotFound("Admin not found");
            }

            await transaction.CommitAsync();
            return Results.Ok(new { message = "Profile updated successfully" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            logger.LogError(ex, "Transaction error");
            return Results.Problem("Database update failed");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Global error");
        return Results.Problem("Internal server error");
    }
});

app.MapGet("/search-users", async (HttpRequest request, ILogger<Program> logger) =>
{
    string userType = request.Query["userType"];
    string name = request.Query["name"];

    if (string.IsNullOrEmpty(userType) || (userType != "patient" && userType != "doctor"))
        return Results.BadRequest("Invalid user type");

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        var query = @"
            SELECT u.id, u.email, u.fname, u.lname, u.picture
            FROM users u
            WHERE u.usertype = @userType 
            AND (LOWER(u.fname) LIKE LOWER(@searchTerm) 
            OR LOWER(u.lname) LIKE LOWER(@searchTerm))";

        var cmd = new NpgsqlCommand(query, conn);
        cmd.Parameters.AddWithValue("userType", userType);
        cmd.Parameters.AddWithValue("searchTerm", $"%{name}%");

        await using var reader = await cmd.ExecuteReaderAsync();
        var results = new List<object>();

        while (await reader.ReadAsync())
        {
            var profileImage = reader.IsDBNull(4) ? null : Convert.ToBase64String((byte[])reader["picture"]);
            
            results.Add(new
            {
                id = reader.GetInt32(0),
                email = reader.GetString(1),
                name = $"{reader.GetString(2)} {reader.GetString(3)}",
                profileImage = profileImage != null ? $"data:image/png;base64,{profileImage}" : null
            });
        }

        return Results.Ok(results);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error searching users");
        return Results.Problem("Error searching users");
    }
});

app.MapDelete("/delete-user", async (HttpRequest request, ILogger<Program> logger) =>
{
    string userType = request.Query["userType"];
    string userIdParam = request.Query["userId"];

    if (string.IsNullOrEmpty(userType) || (userType != "patient" && userType != "doctor"))
        return Results.BadRequest("Invalid user type");

    if (string.IsNullOrEmpty(userIdParam) || !int.TryParse(userIdParam, out int userId))
        return Results.BadRequest("Valid user ID is required");

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        await using var transaction = await conn.BeginTransactionAsync();

        try
        {
            // First delete from specific type table (patient or doctor)
            if (userType == "patient")
            {
                // Delete from patient phone numbers
                var phoneCmd = new NpgsqlCommand(
                    "DELETE FROM patientphonenumbers WHERE pid = @id", conn, transaction);
                phoneCmd.Parameters.AddWithValue("id", userId);
                await phoneCmd.ExecuteNonQueryAsync();

                var patientCmd = new NpgsqlCommand(
                    "DELETE FROM patient WHERE id = @id", conn, transaction);
                patientCmd.Parameters.AddWithValue("id", userId);
                await patientCmd.ExecuteNonQueryAsync();
            }
            else // doctor
            {
                // Delete from doctor's related tables
                var phoneCmd = new NpgsqlCommand(
                    "DELETE FROM doctorsphonenumbers WHERE did = @id", conn, transaction);
                phoneCmd.Parameters.AddWithValue("id", userId);
                await phoneCmd.ExecuteNonQueryAsync();

                var deptCmd = new NpgsqlCommand(
                    "DELETE FROM doctordepartment WHERE did = @id", conn, transaction);
                deptCmd.Parameters.AddWithValue("id", userId);
                await deptCmd.ExecuteNonQueryAsync();

                var doctorCmd = new NpgsqlCommand(
                    "DELETE FROM doctor WHERE id = @id", conn, transaction);
                doctorCmd.Parameters.AddWithValue("id", userId);
                await doctorCmd.ExecuteNonQueryAsync();
            }

            // Finally delete from users table
            var userCmd = new NpgsqlCommand(
                "DELETE FROM users WHERE id = @id AND usertype = @userType", conn, transaction);
            userCmd.Parameters.AddWithValue("id", userId);
            userCmd.Parameters.AddWithValue("userType", userType);
            var rowsAffected = await userCmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
            {
                await transaction.RollbackAsync();
                return Results.NotFound($"{userType} not found");
            }

            await transaction.CommitAsync();
            return Results.Ok(new { message = $"{userType} deleted successfully" });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error deleting user");
        return Results.Problem("Error deleting user");
    }
});

app.MapGet("/get-user-redirect", async (HttpRequest request, ILogger<Program> logger) =>
{
    string userIdParam = request.Query["userId"];
    if (string.IsNullOrEmpty(userIdParam) || !int.TryParse(userIdParam, out int userId))
    {
        return Results.BadRequest("Valid user ID is required");
    }

    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();
        
        var cmd = new NpgsqlCommand(
            "SELECT usertype FROM users WHERE id = @userId",
            conn);
        
        cmd.Parameters.AddWithValue("userId", userId);
        
        var userType = await cmd.ExecuteScalarAsync() as string;
        
        if (string.IsNullOrEmpty(userType))
            return Results.NotFound("User not found");

        string redirectPath = userType.ToLower() switch
        {
            "patient" => "/patient-profile",
            "doctor" => "/doctor-profile",
            "admin" => "/admin-profile",
            _ => "/"
        };

        return Results.Ok(new { 
            userType = userType,
            redirect = redirectPath
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error getting user redirect info");
        return Results.Problem("Error retrieving user information");
    }
});

app.MapGet("/admin-stats", async (ILogger<Program> logger) =>
{
    try
    {
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();

        // Get doctor statistics
        var doctorStats = new { total = 0, male = 0, female = 0 };
        var patientStats = new { total = 0, male = 0, female = 0 };

        // Get doctor statistics
        using (var doctorCmd = new NpgsqlCommand(
            @"SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_count,
                SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_count
            FROM users 
            WHERE usertype = 'doctor'",
            conn))
        {
            using var doctorReader = await doctorCmd.ExecuteReaderAsync();
            if (await doctorReader.ReadAsync())
            {
                doctorStats = new
                {
                    total = doctorReader.GetInt32(0),
                    male = doctorReader.GetInt32(1),
                    female = doctorReader.GetInt32(2)
                };
            }
        }

        // Get patient statistics
        using (var patientCmd = new NpgsqlCommand(
            @"SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male_count,
                SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female_count
            FROM users 
            WHERE usertype = 'patient'",
            conn))
        {
            using var patientReader = await patientCmd.ExecuteReaderAsync();
            if (await patientReader.ReadAsync())
            {
                patientStats = new
                {
                    total = patientReader.GetInt32(0),
                    male = patientReader.GetInt32(1),
                    female = patientReader.GetInt32(2)
                };
            }
        }

        return Results.Ok(new
        {
            doctors = doctorStats,
            patients = patientStats
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error fetching admin stats");
        return Results.Problem("Error retrieving statistics");
    }
});

app.MapStaticAssets();
app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();