// import axios from "axios";

// export const isIPReliable = async (ip: string) => {
//   try {
//     const response = await axios.get("https://api.abuseipdb.com/api/v2/check", {
//       params: {
//         ipAddress: ip,
//         maxAgeInDays: 90,
//         verbose: true,
//       },
//       headers: {
//         Key: process.env.ABUSEIP_API_KEY, // Zamień na swój klucz API
//         Accept: "application/json",
//       },
//     });

//     if (response.status !== 200) {
//       throw new Error("Error while checking IP address");
//     }
//   } catch (error) {
//     throw new Error("Error while checking IP address");
//   }
// };
