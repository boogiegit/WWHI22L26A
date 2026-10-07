const OCTOBER_SCHEDULE_UPDATES = [
  {
    "day": 2,
    "title": "Breakfast and Bags",
    "before": {
      "time": "06:30"
    },
    "after": {
      "time": "06:15"
    }
  },
  {
    "day": 2,
    "title": "Depart Amsterdam",
    "before": {
      "note": ""
    },
    "after": {
      "note": "Passports, cameras, phones, phone chargers — safe cleared?"
    }
  },
  {
    "day": 3,
    "title": "Depart",
    "before": {
      "time": "13:30",
      "title": "Depart"
    },
    "after": {
      "time": "13:15",
      "title": "Depart Munich"
    }
  },
  {
    "day": 3,
    "title": "Local coach back to hotel",
    "before": {
      "time": "22:15"
    },
    "after": {
      "time": "Evening"
    }
  },
  {
    "day": 4,
    "title": "Breakfast and bags",
    "before": {
      "time": "07:03"
    },
    "after": {
      "time": "07:15"
    }
  },
  {
    "day": 4,
    "title": "Depart Innsbruck",
    "before": {
      "time": "08:30"
    },
    "after": {
      "time": "08:15"
    }
  },
  {
    "day": 6,
    "title": "Arrive Vatican Inside St Peter's & The Roman Forum.",
    "before": {
      "title": "Arrive Vatican Inside St Peter's & The Roman Forum."
    },
    "after": {
      "title": "Arrive Vatican — Inside St. Peter's"
    }
  },
  {
    "day": 6,
    "title": "Depart on coach to continue Inside St Peter's & The Roman Forum",
    "before": {
      "title": "Depart on coach to continue Inside St Peter's & The Roman Forum"
    },
    "after": {
      "title": "Depart on coach to continue Inside St. Peter's and Legends and Landmarks of Rome"
    }
  },
  {
    "day": 6,
    "title": "Return to hotel for rest & Lunch",
    "before": {
      "time": "12:30"
    },
    "after": {
      "time": "12:45"
    }
  },
  {
    "day": 7,
    "title": "Gold Corner & Leather shopping opportunities",
    "before": {
      "time": "12:15",
      "title": "Gold Corner & Leather shopping opportunities"
    },
    "after": {
      "time": "13:15",
      "title": "Gold, watch and leather shopping opportunities"
    }
  },
  {
    "day": 7,
    "title": "Free time for late lunch and free time",
    "before": {
      "time": "TBC"
    },
    "after": {
      "time": "13:15"
    }
  },
  {
    "day": 7,
    "title": "Meet Local Specialist for Included Sightseeing: Duomo, Baptistery & Piazza della Signoria finishing in Piazza San Marco",
    "before": {
      "time": "14:45",
      "title": "Meet Local Specialist for Included Sightseeing: Duomo, Baptistery & Piazza della Signoria finishing in Piazza San Marco"
    },
    "after": {
      "time": "12:15",
      "title": "Meet local specialist for included sightseeing walk"
    }
  },
  {
    "day": 8,
    "title": "Cross CH Border",
    "before": {
      "title": "Cross CH Border"
    },
    "after": {
      "title": "Cross the Swiss border"
    }
  },
  {
    "day": 9,
    "title": "Depart hotel for 'Mount Pilatus and Lake Cruise'",
    "before": {
      "title": "Depart hotel for 'Mount Pilatus and Lake Cruise'"
    },
    "after": {
      "title": "Depart hotel for Mount Stanserhorn"
    }
  },
  {
    "day": 10,
    "title": "Breakfast and Bags - take 15 minutes break",
    "before": {
      "time": "06:30",
      "title": "Breakfast and Bags - take 15 minutes break"
    },
    "after": {
      "time": "06:00",
      "title": "Breakfast and Bags"
    }
  },
  {
    "day": 10,
    "title": "Depart on Local coach for hotel",
    "before": {
      "time": "22:00",
      "title": "Depart on Local coach for hotel"
    },
    "after": {
      "time": "EVE",
      "title": "Depart on local coach for hotel"
    }
  },
  {
    "day": 11,
    "title": "Paris Included Dinner",
    "before": {
      "time": "17:45"
    },
    "after": {
      "time": "17:30"
    }
  }
];
function applyOctoberScheduleUpdates(day, revision) {
  if (revision === '20261006-fixes') return;
  if (day.number === 2) {
    const departure = (day.schedule || []).find(row => row.time === '14:20' && row.title === 'Depart St. Goar');
    if (departure) departure.title = 'Depart Boppard';
  }
  if (revision === '20261002-details') return;
  for (const rule of OCTOBER_SCHEDULE_UPDATES.filter(rule=>rule.day===day.number)) {
    const row=(day.schedule || []).find(item=>item.title===rule.title && (rule.before.time == null || item.time===rule.before.time));
    if (!row) continue;
    for (const [field,value] of Object.entries(rule.after)) {
      if ((row[field] || '')===rule.before[field]) row[field]=value;
    }
  }
  if (day.number===7) day.schedule.sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
