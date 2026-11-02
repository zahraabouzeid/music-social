const SEPARATOR: char = '\u{1f}';

pub fn identity_key(artist: &str, title: &str) -> String {
    format!(
        "{}{SEPARATOR}{}",
        normalize(artist),
        normalize(strip_version(title))
    )
}

fn normalize(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn strip_version(title: &str) -> &str {
    let lowered = title.to_lowercase();
    for marker in [
        " - remaster",
        " - remastered",
        " (remaster",
        " (remastered",
        " - single version",
    ] {
        if let Some(index) = lowered.find(marker) {
            return title[..index].trim_end();
        }
    }
    title
}

#[cfg(test)]
mod tests {
    use super::identity_key;

    #[test]
    fn spacing_and_case_do_not_matter() {
        assert_eq!(
            identity_key("Sleep Token", "The Summoning"),
            identity_key("sleep  token ", "the summoning")
        );
    }

    #[test]
    fn remaster_suffixes_count_as_the_same_song() {
        assert_eq!(
            identity_key("Metallica", "Fade to Black - Remastered 2016"),
            identity_key("Metallica", "Fade To Black")
        );
        assert_eq!(
            identity_key("Queen", "Bohemian Rhapsody (Remastered 2011)"),
            identity_key("Queen", "Bohemian Rhapsody")
        );
    }

    #[test]
    fn different_artists_stay_apart() {
        assert_ne!(identity_key("A", "Song"), identity_key("B", "Song"));
    }
}
