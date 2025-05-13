namespace operationRoom.Models
{
    public class AdminProfileUpdateRequest
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Gender { get; set; }
        public string EmailAddress { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string ProfileImage { get; set; }
    }
} 