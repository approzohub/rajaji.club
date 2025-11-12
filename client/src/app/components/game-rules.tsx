import React from "react";

export function GameRules() {
  const rules = [
    "राजाजी गेम में आप लाखो रुपये कमा सकते हैं और कभी भी अपने बैंक खाते में ट्रांसफर कर सकते हैं।",
    "गेम में अपनी आईडी बनवाने के लिए आप हमारे व्हाट्सएप नंबर पर मैसेज कर सकते हैं।",
    "नई आईडी पर आपको गेम खेलने के लिए 30 रुपये का बोनस मिलेगा।",
    "गेम की आईडी पर न्यूनतम 100 रुपये का रिचार्ज होगा",
    "एक कार्ड की वैल्यू 10 रुपये है और अगर रिजल्ट में आपका कार्ड आता है तो आपको 10 रुपये के 100 रुपये मिलेंगे।",
    "किसी भी कार्ड को आप कितनी भी बार या कितनी भी मात्रा में खरीद सकते हैं।",
    "हर गेम 30 मिनट का है और इसमे कार्ड लेने का समय 25 मिनट का है और 5 मिनट का समय परिणाम का रहेगा।",
    "पहला गेम सुबह 9:00 बजे शुरु होगा और आखिरी गेम रात 11:30 बजे शुरु होगा।",
    "पहले गेम का रिजल्ट सुबह 9:30 बजे आएगा और आखिरी गेम का रिजल्ट रात 12:00 बजे आएगा",
    "इसी प्रकार हर गेम का रिजल्ट 30 मिनट बाद आएगा।",
    "जीते हुए पैसे आप कभी भी व्हाट्सएप पर अनुरोध करके अपने बैंक खाते में ट्रांसफर कर सकते हैं।"
  ];

  return (
    <div id="game-rules" className="w-full max-w-6xl mt-8 p-6 rounded-lg flex-shrink-0">
      <h3
        className="mb-4 text-white font-semibold"
        style={{
          fontFamily: 'Poppins',
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '24px',
          letterSpacing: '0%',
        }}
      >
        खेल के नियम
      </h3>
      <ul
        className="list-decimal list-inside space-y-2"
        style={{
          fontFamily: 'Poppins',
          fontWeight: 400,
          fontSize: '16px',
          lineHeight: '20px',
          letterSpacing: '0%',
          color: '#FFFFFF',
        }}
      >
        {rules.map((rule, index) => (
          <li key={index} className="text-white">
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
} 