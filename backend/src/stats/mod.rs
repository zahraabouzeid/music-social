pub mod repo;

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Period {
    Week,
    #[default]
    Month,
    Year,
    All,
}

impl Period {
    pub fn start(self, now: DateTime<Utc>) -> DateTime<Utc> {
        match self {
            Self::Week => now - Duration::days(7),
            Self::Month => now - Duration::days(30),
            Self::Year => now - Duration::days(365),
            Self::All => DateTime::<Utc>::UNIX_EPOCH,
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::Period;

    #[test]
    fn periods_count_back_from_now() {
        let now = Utc.with_ymd_and_hms(2026, 11, 2, 12, 0, 0).unwrap();
        assert_eq!(
            Period::Week.start(now),
            Utc.with_ymd_and_hms(2026, 10, 26, 12, 0, 0).unwrap()
        );
        assert_eq!(
            Period::All.start(now),
            Utc.with_ymd_and_hms(1970, 1, 1, 0, 0, 0).unwrap()
        );
    }
}
