using System.ComponentModel.DataAnnotations;

namespace operationRoom.Models;

public class PatientRegisterRequest
{
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress]
    public string Email { get; set; }

    [Required(ErrorMessage = "Password is required")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z]).+$", ErrorMessage = "Password must contain at least one uppercase and one lowercase letter")]
    [DataType(DataType.Password)]
    public string Password { get; set; }

    [Required(ErrorMessage = "First name is required")]
    public string FirstName { get; set; }

    [Required(ErrorMessage = "Last name is required")]
    public string LastName { get; set; }

    [Required(ErrorMessage = "Address is required")]
    public string Address { get; set; }

    [Required(ErrorMessage = "Phone number is required")]
    [RegularExpression(@"^01\d{9}$", ErrorMessage = "Phone number must start with '01' and be exactly 11 digits")]
    public string PhoneNumber { get; set; }

    [Required(ErrorMessage = "Gender is required")]
    public string Gender { get; set; }

    [Required(ErrorMessage = "Birth year is required")]
    public string BirthYear { get; set; }

    [Required(ErrorMessage = "Birth month is required")]
    public string BirthMonth { get; set; }

    [Required(ErrorMessage = "Birth day is required")]
    public string BirthDay { get; set; }
    
    [Required(ErrorMessage = "ssn is required")]
    public string ssn { get; set; }

    [Required(ErrorMessage = "Insurance information is required")]
    public string Insurance { get; set; }

    [Required(ErrorMessage = "Marital status is required")]
    public string MaritalStatus { get; set; }

    [Required(ErrorMessage = "Medical history is required")]
    public string MedicalHistory { get; set; }

    [Required(ErrorMessage = "Blood group is required")]
    public string BloodGroup { get; set; }
}