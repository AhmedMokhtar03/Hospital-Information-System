using System.ComponentModel.DataAnnotations;

namespace operationRoom.Models;

public class DoctorRegisterRequest
{
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress]
    public string Email { get; set; }

    [Required(ErrorMessage = "Password is required")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z]).+$", ErrorMessage = "Password must contain at least one uppercase and one lowercase letter")]
    [DataType(DataType.Password)]
    public string Password { get; set; }

    [Required]
    public string FirstName { get; set; }

    [Required]
    public string LastName { get; set; }

    [Required]
    public string Address { get; set; }

    [Required(ErrorMessage = "Phone number is required")]
    [RegularExpression(@"^01\d{9}$", ErrorMessage = "Phone number must start with '01' and be exactly 11 digits")]
    public string PhoneNumber { get; set; }

    [Required]
    public string Department { get; set; }

    [Required]
    public string Gender { get; set; }

    [Required]
    public string BirthYear { get; set; }
    
    [Required]
    public string ssn { get; set; }

    [Required]
    public string BirthMonth { get; set; }

    [Required]
    public string BirthDay { get; set; }
}