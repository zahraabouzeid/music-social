#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Relationship {
    Own,
    Following,
    Stranger,
}

#[derive(Debug, Clone, Copy)]
pub struct Signals {
    pub age_hours: f64,
    pub likes: i64,
    pub relationship: Relationship,
    pub taste_similarity: f64,
}

const GRAVITY: f64 = 1.4;

pub fn score(signals: Signals) -> f64 {
    let engagement = 1.0 + (signals.likes.max(0) as f64).ln_1p();
    let relationship = match signals.relationship {
        Relationship::Own => 0.8,
        Relationship::Following => 1.0,
        Relationship::Stranger => 0.35,
    };
    let taste = 1.0 + signals.taste_similarity.clamp(0.0, 1.0);
    let freshness = (signals.age_hours.max(0.0) + 2.0).powf(GRAVITY);
    engagement * relationship * taste / freshness
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Signals {
        Signals {
            age_hours: 3.0,
            likes: 0,
            relationship: Relationship::Following,
            taste_similarity: 0.0,
        }
    }

    #[test]
    fn newer_posts_rank_higher() {
        let old = Signals {
            age_hours: 30.0,
            ..base()
        };
        assert!(score(base()) > score(old));
    }

    #[test]
    fn likes_help_with_diminishing_returns() {
        let few = score(Signals { likes: 5, ..base() });
        let many = score(Signals {
            likes: 50,
            ..base()
        });
        assert!(few > score(base()));
        assert!(many > few);
        assert!(many < few * 2.0);
    }

    #[test]
    fn people_you_follow_beat_strangers_unless_taste_matches_and_post_is_popular() {
        let stranger = Signals {
            relationship: Relationship::Stranger,
            ..base()
        };
        assert!(score(base()) > score(stranger));

        let kindred_hit = Signals {
            likes: 40,
            taste_similarity: 0.9,
            ..stranger
        };
        assert!(score(kindred_hit) > score(base()));
    }

    #[test]
    fn similar_taste_lifts_a_post() {
        let similar = Signals {
            taste_similarity: 0.8,
            ..base()
        };
        assert!(score(similar) > score(base()));
    }
}
