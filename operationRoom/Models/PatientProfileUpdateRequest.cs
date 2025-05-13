namespace operationRoom.Models
{
    public class PatientProfileUpdateRequest
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Gender { get; set; }
        public string EmailAddress { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string ProfileImage { get; set; }
        public string BloodGroup { get; set; }
        public string Insurance { get; set; }
        
        public string ChronicDiseases { get; set; }
    }
}