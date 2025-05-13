using System.Text.Json;
using System.Text.Json.Serialization;

public class ByteArrayConverter : JsonConverter<byte[]>
{
    public override byte[] Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var base64String = reader.GetString();
            if (string.IsNullOrEmpty(base64String)) return Array.Empty<byte>();

            var base64Data = base64String.Split(',').Last();
            return Convert.FromBase64String(base64Data);
        }

        throw new JsonException();
    }

    public override void Write(
        Utf8JsonWriter writer,
        byte[] value,
        JsonSerializerOptions options)
    {
        writer.WriteStringValue(Convert.ToBase64String(value));
    }
}